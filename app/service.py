import os
import json
import winrm
import json
from Evtx.Evtx import FileHeader
from xml.etree.ElementTree import XML

def get_logs(hostname, username, password):
    try:
        session = winrm.Session(f'http://{hostname}:5985/wsman', auth=(username, password), transport='basic')
        app_logs_command = 'Get-EventLog -LogName Application | Select-Object -Property * | ConvertTo-Json -Depth 10 | Format-List'
        
        app_logs = session.run_ps(app_logs_command)

        logs_output = app_logs.std_out.decode()

        try:
            logs_data = json.loads(logs_output)
        except json.JSONDecodeError as e:
            print(e)
            logs_data = logs_output
        
        logs_json = {
            "hostname": hostname,
            "username": username,
            "password": password,
            "application": logs_data,
        }

        file_path = os.getenv("MODEL_OUTPUT_DIR")
        file_name = f"{hostname}_{username}_{password}.json"

        dump_json_file(logs_json, file_path, file_name)
        return "true"
        
    except Exception as e:
        print(f"Failed to connect to the Windows VM: {str(e)}")
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
        result = get_logs(hostname, username, password)
    else:
        result = "true"

    return result, new_unique_data, existing_data

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

# Example usage
# evtx_to_json("path_to_evtx_file.evtx", "output_file.json")

