from flask import Blueprint, render_template, request, url_for, redirect, flash
from requests.exceptions import RequestException
import json
import os
from dotenv import load_dotenv
import subprocess
from app.service import host_verification, evtx_lookup_and_conversion
load_dotenv()

main = Blueprint('main', __name__)
main.secret_key = "0k:(7o%MZ|SD/Qw.L21dWJ9BY@}%QX"


@main.route('/')
def home():
    return render_template('home.html')


@main.route('/upload', methods = ['POST'])
def upload():
    try:
        hostFile = request.files['file']
        new_data = json.load(hostFile)

        # check if all required keys are present or not and only pass them and get logs and flag is true if just hostdetails
        result, new_unique_data, existing_data = host_verification(new_data, flag=True)

        if result == "false":
            return redirect(url_for('main.main'))

        if new_unique_data:
            existing_data["details"].extend(new_data["details"])

            with open(os.getenv("MODEL_INPUT_DIR"), 'w') as f:
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
        result, new_unique_data, existing_data = host_verification(host_json_data, flag=False)

        hostname=host_json_data["details"][0]['hostname']
        username=host_json_data["details"][0]['username']
        password=host_json_data["details"][0]['password']

        file_name = f"{hostname}_{username}_{password}.json"
        file_path = os.path.join(os.getenv("MODEL_OUTPUT_DIR"), file_name)

        evtx_file_name = f"{hostname}_{username}_{password}.evtx"
        evtx_file_path = os.path.join(os.getcwd() + "/" + os.getenv("MODEL_INPUT_EVTX"), evtx_file_name)
        evtxFile.save(evtx_file_path)    

        # Extx file lookup and convert to json
        subprocess.run([f"cd python-evtx && cd scripts && ls && python3 evtx_dump.py {evtx_file_path} {hostname} {username} {password}"], shell=True)

        if new_unique_data:
            existing_data["details"].extend(host_json_data["details"])

            with open(os.getenv("MODEL_INPUT_DIR"), 'w') as f:
                json.dump(existing_data, f, indent=4)

        with open(os.getenv("MODEL_INPUT_DIR"), 'r') as f:
            hosts = json.load(f)
            return render_template('hosts.html', hosts=hosts)
        
    except Exception as e:
        print(e)
        return render_template('home.html')

    
@main.route('/hosts')
def hosts():
    try:
        with open(os.getenv("MODEL_INPUT_DIR"), 'r') as f:
            hosts = json.load(f)
            return render_template('hosts.html', hosts=hosts)
    except Exception as e:
        print(e)


@main.route('/getLog', methods=['POST'])
def getLog():
    try:
        hostname = request.form['hostname']
        username = request.form['username']
        password = request.form['password']
        
        file_name = f"{hostname}_{username}_{password}.json"
        file_path = os.path.join(os.getenv("MODEL_OUTPUT_DIR"), file_name)

        with open(file_path, "r") as f:
            log_data = json.load(f)
            log_output = json.dumps(log_data, indent=4)

        return render_template('logs.html', logs=log_output)
    except Exception as e:
        error = f"Failed to connect to the Windows VM: {str(e)}"
        return render_template('logs.html', error=error)
        

# @main.route('/logs')
# def logs():
#     try:
#         remote_machine_info = open(os.getenv("MODEL_INPUT_DIR"))
#         json_data = json.load(remote_machine_info)

#         for detail in json_data["details"]:
#             hostname = detail["hostname"]
#             username = detail["username"]
#             password = detail["password"]

#             session = winrm.Session(f'http://{hostname}:5985/wsman', auth=(username, password), transport='basic')
#             app_logs_command = 'Get-EventLog -LogName Application | Select-Object -Property * | ConvertTo-Json -Depth 10 | Format-List'
            
#             app_logs = session.run_ps(app_logs_command)

#             logs_output = app_logs.std_out.decode()

#             try:
#                 logs_data = json.loads(logs_output)
#             except json.JSONDecodeError as e:
#                 logs_data = logs_output
            
#             logs_json = {
#                 "hostname": hostname,
#                 "username": username,
#                 "password": password,
#                 "application": logs_data,
#             }

#             file_path = os.getenv("MODEL_OUTPUT_DIR")
#             file_name = f"{hostname}_{username}_{password}.json"

#             dump_json_file(logs_json, file_path, file_name)

#             logs_view = {
#                 "application": logs_output
#             }

#             return render_template('logs.html', logs=logs_view)
        
#     except Exception as e:
#         error = f"Failed to connect to the Windows VM: {str(e)}"
#         return render_template('logs.html', error=error)
