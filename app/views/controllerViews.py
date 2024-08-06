from flask import Blueprint, render_template, request, url_for, redirect, flash
import json
import os
from dotenv import load_dotenv
import subprocess
import time
from flask import Response
from app.service.controllerService import host_verification, fetch_logs, preprocess
import platform
from datetime import datetime
import re
from app.service.modelService import add_machine_and_event
load_dotenv()

main = Blueprint('main', __name__)
main.secret_key = "0k:(7o%MZ|SD/Qw.L21dWJ9BY@}%QX"


@main.route('/home')
def home():
    return render_template('home/home.html')
 
 
@main.route('/upload', methods = ['POST'])
def upload():
    try:
        hostFile = request.files['file']
        new_data = json.load(hostFile)
 
        # check if all required keys are present or not and only pass them and get logs and flag is true if just hostdetails
        result, new_unique_data, existing_data, all_logs = host_verification(new_data, flag=True)
 
        if result == "false":
            return redirect(url_for('main.main'))
 
        if new_unique_data:
            existing_data["details"].extend(new_data["details"])
            hostname = all_logs['hostname']
            username = all_logs['username']
            password = all_logs['password']
            application = all_logs['application']

            add_machine_and_event(hostname, username, password, application)
 
            with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'w') as f:
                json.dump(existing_data, f, indent=4)
 
        return redirect(url_for('main.hosts'))
   
    except Exception as e:
        flash(f'Invalid file format: {str(e)}')
        return redirect(url_for('main.home'))


@main.route('/upload_evtx', methods = ["POST"])
def upload_evtx():
    try:
        hostFile = request.files['hostfile']
        evtxFile = request.files['evtxfile']
       
        host_json_data = json.load(hostFile)
 
        # check if all required keys are present or not and only pass them and get logs and flag is false if there is already a EVTX File
        host_verification(host_json_data, flag=False)
 
        hostname=host_json_data["details"][0]['hostname']
        username=host_json_data["details"][0]['username']
        password=host_json_data["details"][0]['password']
 
        evtx_file_name = f"{hostname}_{username}_{password}.evtx"
        evtx_file_path = os.path.join(os.getcwd() + "/" + os.getenv("MODEL_INPUT_EVTX"), evtx_file_name).replace("\\", "/")
        evtxFile.save(evtx_file_path)    
 
        if platform.system() == "Windows":
            # Windows specific command
            command = [
                "cmd", "/c", "cd python-evtx && cd scripts && python evtx_dump.py", evtx_file_path, hostname, username, password
            ]
        else:
            # Mac/Linux specific command
            command = [
                "sh", "-c", f"cd python-evtx/scripts && python evtx_dump.py {evtx_file_path} {hostname} {username} {password}"
            ]
        subprocess.run(command)

        # Sometimes files are having ][ so just replacing that with ','
        file_name = f"{hostname}_{username}_{password}.json"
        file_path = os.path.join(os.getenv("MODEL_OUTPUT_DIR"), file_name)

        with open(file_path, 'r') as file:
            file_contents = file.read()
            file_contents = file_contents.replace('][', ',')

        # Write the modified contents back to the file
        with open(file_path, 'w') as file:
            file.write(file_contents)
 
        with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'r') as f:
            return redirect(url_for('main.hosts'))
       
    except Exception as e:
        print(e)
        return render_template('home/home.html')
 
   
@main.route('/hosts')
def hosts():
    try:
        with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'r') as f:
            hosts = json.load(f)
            return render_template('hosts/hosts.html', hosts=hosts)
    except Exception as e:
        print(e)
 

@main.route('/getLog', methods=['POST'])
def getLog():
    try:
        hostname = request.form['hostname']
        username = request.form['username']
        password = request.form['password']
       
        file_name = f"{hostname}_{username}_{password}.json"
        file_path = os.path.join(os.getenv("MODEL_OUTPUT_DIR").replace("\\", "/"), file_name)
 
        with open(file_path, "r") as f:
            log_data = json.load(f)
            log_output = json.dumps(log_data, indent=4)
 
        return render_template('logs.html', logs=log_output)
    except Exception as e:
        error = f"Failed to connect to the Windows VM: {str(e)}"
        return render_template('logs.html', error=error)



@main.route('/liveLogs', methods=['GET'])
def liveLogs():
    # Get credentials from the query string
    hostname = request.args.get('hostname')
    username = request.args.get('username')
    password = request.args.get('password')

    def generate():
        last_fetched = None  
        all_logs = [] 
        year_counts = {str(year): 0 for year in range(datetime.now().year - 4, datetime.now().year + 1)}
        log_counts = [0, 0, 0, 0, 0]  # assuming log levels range from 0 to 4
        while True:
            # Fetch new logs and update the last fetched timestamp
            new_logs, last_fetched = fetch_logs(hostname, username, password, last_fetched)
            if new_logs:
                if not all_logs:
                    all_logs.extend(new_logs)
                else:
                    if 'Level' in new_logs:
                        all_logs.append(new_logs) 
                    else:
                        all_logs.extend(new_logs)

                # If new log only has one event it is opening up, so if only one case needs this.
                if 'Level' in new_logs:
                    # Number of events per level calculation
                    level = new_logs.get('Level', 0)  
                    if 0 <= level < len(log_counts):
                        log_counts[level] += 1

                    # Filtering number of events for past 5 years
                    timestamp = log.get('TimeCreated')
                    year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')
                    if year in year_counts:
                        year_counts[year] += 1

                # If multiple logs present do iteration
                else:
                    for log in new_logs:
                        level = log.get('Level', 0)
                        if 0 <= level < len(log_counts):
                            log_counts[level] += 1
                        
                        timestamp = log.get('TimeCreated')
                        year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')
                        if year in year_counts:
                            year_counts[year] += 1

                yield f"data: {json.dumps({'counts': log_counts, 'yearCounts': year_counts})}\n\n"
            time.sleep(15)

    return Response(generate(), mimetype="text/event-stream")

@main.route('/stream', methods=['POST'])
def stream():
    return render_template('liveLogs/liveLogs.html', form_data=request.form)
