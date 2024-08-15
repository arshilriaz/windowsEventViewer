from flask import Blueprint, render_template, request, url_for, redirect
import json
import os
from dotenv import load_dotenv
from flask import make_response, jsonify
from app.service.controllerService import host_verification, liveLogsService, uploadEVTXService, uploadService
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
        if uploadService(hostFile=hostFile):
            return make_response(jsonify(message="Success"), 200)
        else:
            return make_response(jsonify(message="Invalid Credentials"), 400)
   
    except Exception as e:
        error_message = f'Invalid Credentials'
        response = make_response(jsonify(message=error_message), 400)
        return response


@main.route('/upload_evtx', methods = ["POST"])
def upload_evtx():
    try:
        hostFile = request.files['hostfile']
        evtxFile = request.files['evtxfile']
        return uploadEVTXService(hostFile, evtxFile)
        
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

@main.route('/removeMachine', methods=['POST'])
def removeMachine():
    try:
        hostname = request.form['hostname']
        username = request.form['username']
        password = request.form['password']
        evtx = request.form.get('evtx') == 'True'

        file_path = os.getenv("MODEL_OUTPUT_DIR")
        file_name = f"{hostname}_{username}_{password}.json"  # Consider hashing or more secure handling
        full_path = os.path.join(file_path, file_name)

        input_file_path = os.getenv("MODEL_INPUT_DIR")

        if os.path.exists(input_file_path):
            with open(input_file_path, "r") as file:
                data = json.load(file)

            # Filter out the entry matching the provided details
            updated_details = [entry for entry in data["details"] if not (
                entry["hostname"] == hostname and 
                entry["username"] == username and 
                entry["password"] == password and 
                entry["evtx"] == evtx
            )]

            # Write the updated data back to the JSON file
            with open(input_file_path, "w") as file:
                json.dump({"details": updated_details}, file, indent=4)

        
        if evtx and os.path.exists(full_path):
            os.remove(full_path)
                
        return redirect(url_for('main.hosts'))
    except Exception:
        return jsonify({"status": "error", "message": "File not found."}), 404
