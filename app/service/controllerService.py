import os
import json
import winrm
import json
from Evtx.Evtx import FileHeader
from xml.etree.ElementTree import XML
from datetime import datetime
import re
import subprocess

def get_logs(hostname, username, password):
    try:
        local_hostname = os.getenv('COMPUTERNAME')
       
        if hostname == local_hostname:
            # Fetch logs from the local machine
            app_logs_command = 'Get-WinEvent -LogName Application | ConvertTo-Json'
            result = subprocess.run(["powershell", "-Command", app_logs_command], capture_output=True, text=True)
            logs_output = result.stdout
        else:
            # Fetch logs from the remote machine using WinRM
            session = winrm.Session(f'http://{hostname}:5985/wsman', auth=(username, password), transport='basic')
            app_logs_command = 'Get-WinEvent -LogName Application | ConvertTo-Json'
            app_logs = session.run_ps(app_logs_command)
            logs_output = app_logs.std_out.decode()
 
        try:
            logs_data = json.loads(logs_output)
        except json.JSONDecodeError as e:
            print(e)
            logs_data = logs_output
       
        # Process the logs_data into the desired format
        processed_logs = []
        for log in logs_data:
            event_xml = {
                "Event": {
                    "@xmlns": "http://schemas.microsoft.com/win/2004/08/events/event",
                    "System": {
                        "Provider": {
                            "@Name": log.get("ProviderName"),
                            "@Guid": log.get("ProviderId")
                        },
                        "EventID": {
                            "@Qualifiers": log.get("Qualifiers"),
                            "#text": log.get("Id")
                        },
                        "Version": log.get("Version"),
                        "Source": (
                            "Critical" if log.get("Level") == 0 else
                            "Warning" if log.get("Level") == 1 else
                            "Verbose" if log.get("Level") == 2 else
                            "Error" if log.get("Level") == 3 else
                            "Information"
                        ),
                        "Task": log.get("Task"),
                        "Opcode": log.get("Opcode"),
                        "Keywords": log.get("Keywords"),
                        "TimeCreated": {
                            "@SystemTime": datetime.fromtimestamp(int(log['TimeCreated'].strip('/Date()')) / 1000).isoformat() + 'Z'

                        },
                        "EventRecordID": str(log.get("RecordId")),
                        "Correlation": {},
                        "Execution": {
                            "@ProcessID": log.get("ProcessId"),
                            "@ThreadID": log.get("ThreadId"),
                        },
                        "Channel": log.get("LogName"),
                        "Computer": log.get("MachineName"),
                        "Security": {
                            "@UserID": log.get("UserId")
                        }
                    },
                    "EventData": {
                        "Data": log.get("Properties", [])
                    }
                }
            }

            processed_logs.append(event_xml)
       
        logs_json = {
            "hostname": hostname,
            "username": username,
            "password": password,
            "application": processed_logs
        }
 
        file_path = os.getenv("MODEL_OUTPUT_DIR")
        file_name = f"{hostname}_{username}_{password}.json"
 
        dump_json_file(logs_json, file_path, file_name)
        return "true", logs_json
       
    except Exception as e:
        print(f"Failed to retrieve logs: {str(e)}")
        return "false"
    
    
def dump_json_file(json_data, dir_path, fileName):
    try:
        file_path = os.path.join(dir_path, fileName)

        with open(file_path, 'w') as json_file:
            json.dump(json_data, json_file, indent=4)
    except Exception as e:
        print(e)


def host_verification(new_data, flag):
    required_keys = {'hostname', 'username', 'password'}
    for item in new_data["details"]:
        if not required_keys.issubset(item):
            raise ValueError('Missing required keys in Input JSON File')

    if os.path.exists(os.getenv("MODEL_INPUT_DIR")):
        with open(os.getenv("MODEL_INPUT_DIR"), 'r') as f:
            existing_data = json.load(f)
    else:
        existing_data = {"details": []}
    
    hostname=new_data["details"][0]['hostname']
    username=new_data["details"][0]['username']
    password=new_data["details"][0]['password']

    # Ensuring duplicate data don't come
    existing_set = {frozenset(item.items()) for item in existing_data["details"]}
    new_unique_data = [item for item in new_data["details"] if frozenset(item.items()) not in existing_set]

    if flag:
        # To get the logs
        result, all_logs = get_logs(hostname, username, password)
    else:
        result = "true"

    return result, new_unique_data, existing_data, all_logs


def evtx_lookup_and_conversion(evtx_file, json_path):
    header = FileHeader(evtx_file, 0x0)
    events = []
    for record in header.records():
        try:
            xml_content = record.xml()
            event = XML(xml_content)
            event_data = {
                "EventID": event.find(".//EventID").text,
                "MachinName": event.find(".//MachinName").text,
                "TimeGenerated": event.find(".//TimeGenerated").attrib["SystemTime"]
            }
            events.append(event_data)
        except Exception as e:
            print(f"Error processing record: {e}")

    with open(json_path, "w") as json_file:
        json.dump(events, json_file, indent=4)


def fetch_logs(hostname, username, password, last_fetched):
    # Get the local machine's hostname
    local_hostname = os.getenv('COMPUTERNAME')

    if last_fetched is not None:
        # if type(last_fetched) is str:
        #     milliseconds = int(str(last_fetched).strip('/Date()').strip(')/'))
        #     last_fetched = datetime.fromtimestamp(milliseconds / 1000.0)  
        # if last_fetched:
        if type(last_fetched) is str:
            milliseconds = int(str(last_fetched).strip('/Date()').strip(')/'))
            last_fetched = datetime.fromtimestamp(milliseconds / 1000.0)

            strict_milliseconds = milliseconds + 1
            strict_last_fetched = datetime.fromtimestamp(strict_milliseconds / 1000.0)
        
        else:
            strict_milliseconds = int(last_fetched.timestamp() * 1000)
            strict_last_fetched = datetime.fromtimestamp(strict_milliseconds / 1000.0)


        ps_script = f"""
        $date_fetched = [DateTime]::ParseExact('{str(strict_last_fetched)}', 'yyyy-MM-dd HH:mm:ss.fff', [System.Globalization.CultureInfo]::InvariantCulture)
        Get-WinEvent -FilterHashtable @{{LogName = 'Application'; StartTime = $date_fetched}} | ConvertTo-Json -Depth 5
        """
            
    else:
        ps_script = """
                Get-WinEvent -LogName Application | ConvertTo-Json
                """
            
    if hostname == local_hostname:
        result = subprocess.run(["powershell", "-Command", ps_script], capture_output=True, text=True)
        logs_output = result.stdout
 
    else:
        # Fetch logs from the remote machine using WinRM
        session = winrm.Session(f'http://{hostname}:5985/wsman', auth=(username, password), transport='basic')
        result = session.run_ps(ps_script)
        logs_output = result.std_out.decode()

    if result.status_code == 0:
        try:
            logs_data = json.loads(logs_output)
            # Update last_fetched to the most recent log entry time
            if logs_data:
                if "TimeCreated" in logs_data:
                    last_fetched = logs_data['TimeCreated']
                else:
                    last_fetched = logs_data[0]['TimeCreated']
            return logs_data, last_fetched
        except json.JSONDecodeError:
            return [], last_fetched
    else:
        return [], last_fetched


def convert_json_date_to_datetime(json_date):
    milliseconds = int(re.search(r'\d+', json_date).group())
    
    # Convert milliseconds to a datetime object
    return datetime.datetime.fromtimestamp(milliseconds / 1000.0)

## Yet to be done
def preprocess(hostname, username, password, host_json_data, ):
    return host_json_data
