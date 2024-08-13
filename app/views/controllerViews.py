from flask import Blueprint, render_template, request, url_for, redirect, flash
import json
import os
from dotenv import load_dotenv
import subprocess
import time
from flask import make_response, jsonify
from app.service.controllerService import host_verification, liveLogsService
import platform
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
        hostFile = request.files['hostfile']
        new_data = json.load(hostFile)
        new_data["details"] = [{**entry, 'evtx': False} for entry in new_data["details"]]
 
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
        error_message = f'Invalid Credentials'
        response = make_response(jsonify(message=error_message), 400)
        return response


@main.route('/upload_evtx', methods = ["POST"])
def upload_evtx():
    try:
        hostFile = request.files['hostfile']
        evtxFile = request.files['evtxfile']
       
        host_json_data = json.load(hostFile)
        host_json_data["details"] = [{**entry, 'evtx': True} for entry in host_json_data["details"]]
 
        # check if all required keys are present or not and only pass them and get logs and flag is false if there is already a EVTX File
        result, new_unique_data, existing_data, all_logs = host_verification(host_json_data, flag=False)
 
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

        if new_unique_data:
            existing_data["details"].extend(host_json_data["details"])
 
            with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'w') as f:
                json.dump(existing_data, f, indent=4)
 
        with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'r') as f:
            return redirect(url_for('main.hosts'))
       
    except Exception as e:
        error_message = f'Invalid Credentials/ Corrupt File'
        response = make_response(jsonify(message=error_message), 400)
        return response
 
   
@main.route('/hosts')
def hosts():
    try:
        with open(os.getenv("MODEL_INPUT_DIR").replace("\\", "/"), 'r') as f:
            hosts = json.load(f)
            return render_template('hosts/hosts.html', hosts=hosts)
    except Exception as e:
        print(e)

@main.route('/liveLogs', methods=['GET'])
def liveLogs():
    # Get credentials from the query string
    hostname = request.args.get('hostname')
    username = request.args.get('username')
    password = request.args.get('password')
    seeLogsValue = request.args.get('seeLogsValue')

    return liveLogsService(hostname, username, password, seeLogsValue)

@main.route('/stream', methods=['POST'])
def stream():
    return render_template('liveLogs/liveLogs.html', form_data=request.form, seeLogs=False)

@main.route('/seeLogsStream', methods=['POST'])
def seeLogsStream():
    return render_template('seeLogs/seeLogs.html', form_data=request.form, seeLogs=True)
