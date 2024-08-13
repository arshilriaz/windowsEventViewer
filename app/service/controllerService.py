import os
import json
import winrm
from Evtx.Evtx import FileHeader
from xml.etree.ElementTree import XML
from datetime import datetime
import re
from flask import jsonify
import subprocess
import time
from datetime import timedelta
from flask import Response, jsonify

def get_logs(hostname, username, password):
    try:
        local_hostname = os.getenv('COMPUTERNAME')
       
        if hostname == local_hostname:
            # Fetch logs from the local machine
            app_logs_command = 'Get-WinEvent -LogName Application -MaxEvents 50 | ConvertTo-Json'
            result = subprocess.run(["powershell", "-Command", app_logs_command], capture_output=True, text=True)
            logs_output = result.stdout
        else:
            # Fetch logs from the remote machine using WinRM
            session = winrm.Session(f'http://{hostname}:5985/wsman', auth=(username, password), transport='basic')
            app_logs_command = 'Get-WinEvent -LogName Application -MaxEvents 50 | ConvertTo-Json'
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
            entry_type = str(log.get("Level"))
            if entry_type == '2':
                entry_type = '3'
            elif entry_type == '1':
                entry_type = '2'
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
                        "Level": str(entry_type),
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
        return jsonify({'message': 'Failed to retrieve logs: {str(e)', 'error': str(e)}), 400
    
    
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
        all_logs = []

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
        result.status_code = 0
 
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

def liveLogsService(hostname, username, password, seeLogsValue):
    if seeLogsValue == 'False':
        def generate():
            last_fetched = None  
            all_logs = [] 
            year_counts = {str(year): 0 for year in range(datetime.now().year - 4, datetime.now().year + 1)}
            log_counts = [0, 0, 0, 0, 0]  # assuming log levels range from 0 to 4
            name_counts = {}  # Dictionary to track the count of each name
            tf_hour_counts = {i: 0 for i in range(24)}

            # Initialize year_counts with at least the last 5 years
            current_year = datetime.now().year
            year_counts = {str(year): 0 for year in range(current_year - 4, current_year + 1)}

            daily_event_counts = {}

            while True:
                # Fetch new logs and update the last fetched timestamp
                new_logs, last_fetched = fetch_logs(hostname, username, password, last_fetched)
                all_logs_count = len(new_logs)
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
                        timestamp = new_logs.get('TimeCreated')
                        year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')
                        if year in year_counts:
                            year_counts[year] += 1
                        else:
                            year_counts[year] = 1
                        
                        # Daily Event Counts
                        log_date = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y-%m-%d')
                        year = log_date[:4]

                        if year not in daily_event_counts:
                            daily_event_counts[year] = {}

                        if log_date not in daily_event_counts[year]:
                            daily_event_counts[year][log_date] = 0

                        daily_event_counts[year][log_date] += 1

                        name = log.get('ProviderName')
                        if name:
                            name_counts[name] = name_counts.get(name, 0) + 1

                        # Update six-hour counts
                        log_time = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000)
                        if datetime.now() - log_time < timedelta(hours=24):
                            hour_delta = (datetime.now() - log_time).total_seconds() // 3600
                            if hour_delta in tf_hour_counts:
                                tf_hour_counts[int(hour_delta)] += 1

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
                            else:
                                year_counts[year] = 1

                            # Daily Event Counts
                            log_date = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y-%m-%d')
                            year = log_date[:4]

                            if year not in daily_event_counts:
                                daily_event_counts[year] = {}

                            if log_date not in daily_event_counts[year]:
                                daily_event_counts[year][log_date] = 0

                            daily_event_counts[year][log_date] += 1

                            # Update six-hour counts
                            log_time = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000)
                            if datetime.now() - log_time < timedelta(hours=24):
                                hour_delta = (datetime.now() - log_time).total_seconds() // 3600
                                if hour_delta in tf_hour_counts:
                                    tf_hour_counts[int(hour_delta)] += 1

                            name = log.get('ProviderName')
                            if name:
                                name_counts[name] = name_counts.get(name, 0) + 1

                    # Initialize a dictionary to hold log type counts per year
                    level_display_counts = {
                        year: {'Information': 0, 'Error': 0, 'Warning': 0} for year in year_counts
                    }
                    level_display_counts['all_years'] = {'Information': 0, 'Error': 0, 'Warning': 0}

                    if 'LevelDisplayName' in new_logs:
                        level_display_name = new_logs.get('LevelDisplayName')

                        year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')

                        if level_display_name in ['Information', 'Error', 'Warning']:
                            if year in level_display_counts:
                                level_display_counts[year][level_display_name] += 1
                                level_display_counts['all_years'][level_display_name] += 1
                    
                    else:
                        for log in new_logs:
                            level_display_name = log.get('LevelDisplayName', 'Unknown')
                            year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')

                            if level_display_name in ['Information', 'Error', 'Warning']:
                                if year in level_display_counts:
                                    level_display_counts[year][level_display_name] += 1
                                    level_display_counts['all_years'][level_display_name] += 1
                    yield f"data: {json.dumps({'logsCount': all_logs_count, 'counts': log_counts, 'yearCounts': year_counts, 'nameCounts': name_counts, 'tenHourCount': tf_hour_counts, 'dailyEventCounts': daily_event_counts, 'all_year_split_counts': level_display_counts,'levelDisplayCounts': level_display_counts, 'newLogs': new_logs})}\n\n"
                time.sleep(15)

        return Response(generate(), mimetype="text/event-stream")
    
    else:
        file_name = f"{hostname}_{username}_{password}.json"
        file_path = os.path.join(os.getenv("MODEL_OUTPUT_DIR").replace("\\", "/"), file_name)
 
        with open(file_path, "r") as f:
            log_data = json.load(f)
            log_values = log_data['application']

            def generate():
                all_logs = log_values
                year_counts = {str(year): 0 for year in range(datetime.now().year - 4, datetime.now().year + 1)}
                log_counts = [0, 0, 0, 0, 0]  # assuming log levels range from 0 to 4
                name_counts = {}  # Dictionary to track the count of each name
                tf_hour_counts = {i: 0 for i in range(24)}

                # Initialize year_counts with at least the last 5 years
                current_year = datetime.now().year
                year_counts = {str(year): 0 for year in range(current_year - 4, current_year + 1)}

                daily_event_counts = {}

                while True:
                    # Fetch new logs and update the last fetched timestamp
                    new_logs = all_logs
                    if new_logs:
                        # If new log only has one event it is opening up, so if only one case needs this.
                        if 'Level' in new_logs:
                            # Number of events per level calculation
                            level = new_logs.get('Level', 0)  
                            if 0 <= level < len(log_counts):
                                log_counts[level] += 1

                            # Filtering number of events for past 5 years
                            timestamp = new_logs.get('TimeCreated')
                            year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')
                            if year in year_counts:
                                year_counts[year] += 1
                            else:
                                year_counts[year] = 1
                            
                            # Daily Event Counts
                            log_date = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y-%m-%d')
                            year = log_date[:4]

                            if year not in daily_event_counts:
                                daily_event_counts[year] = {}

                            if log_date not in daily_event_counts[year]:
                                daily_event_counts[year][log_date] = 0

                            daily_event_counts[year][log_date] += 1

                            name = log.get('ProviderName')
                            if name:
                                name_counts[name] = name_counts.get(name, 0) + 1

                            # Update six-hour counts
                            log_time = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000)
                            if datetime.now() - log_time < timedelta(hours=24):
                                hour_delta = (datetime.now() - log_time).total_seconds() // 3600
                                if hour_delta in tf_hour_counts:
                                    tf_hour_counts[int(hour_delta)] += 1

                        # If multiple logs present do iteration
                        else:
                            for l in new_logs:
                                log = l['Event']['System']
                                level = int(log.get('Level', 0))

                                if level == 0 or level == 4:
                                    l['LevelDisplayName'] = 'Information'
                                elif level == 2:
                                    l['LevelDisplayName'] = 'Error'
                                else:
                                    l['LevelDisplayName'] = 'Warning'
                                
                                l['TimeCreated'] = l['Event']['System']['TimeCreated']['@SystemTime']
                                l['TimeCreated'] = f"/Date({int(datetime.strptime(l['TimeCreated'], '%Y-%m-%d %H:%M:%S.%f').timestamp() * 1000)})/"

                                l['Id'] = l['Event']['System']['EventID']['@Qualifiers'] if l['Event']['System']['EventID']['@Qualifiers'] else l['Event']['System']['EventID']['#text']
                                l['ProviderName'] = l['Event']['System']['Provider']['@Name']
                                l['Message'] = (
                                    lambda: json.dumps(l['Event']['EventData']['Data']) if isinstance(l.get('Event', {}).get('EventData', {}).get('Data', None), list) 
                                    else l['Event']['EventData']['Data'] if l.get('Event', {}).get('EventData', {}).get('Data', None) 
                                    else "No Data is Available"
                                )() if l.get('Event') and l['Event'].get('EventData') else "No Data is Available"

                                if 0 <= level < len(log_counts):
                                    log_counts[level] += 1
                                
                                timestamp = log['TimeCreated']['@SystemTime']
                                year = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S.%f').year

                                if year in year_counts:
                                    year_counts[year] += 1
                                else:
                                    year_counts[year] = 1

                                # Daily Event Counts
                                log_date = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S.%f').strftime('%Y-%m-%d')
                                year = log_date[:4]

                                if year not in daily_event_counts:
                                    daily_event_counts[year] = {}

                                if log_date not in daily_event_counts[year]:
                                    daily_event_counts[year][log_date] = 0

                                daily_event_counts[year][log_date] += 1

                                # Update six-hour counts
                                log_time = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000)
                                if datetime.now() - log_time < timedelta(hours=24):
                                    hour_delta = (datetime.now() - log_time).total_seconds() // 3600
                                    if hour_delta in tf_hour_counts:
                                        tf_hour_counts[int(hour_delta)] += 1

                                name = log['Provider']['@Name']
                                if name:
                                    name_counts[name] = name_counts.get(name, 0) + 1

                        # Initialize a dictionary to hold log type counts per year
                        level_display_counts = {
                            year: {'Information': 0, 'Error': 0, 'Warning': 0} for year in year_counts
                        }
                        level_display_counts['all_years'] = {'Information': 0, 'Error': 0, 'Warning': 0}

                        if 'LevelDisplayName' in new_logs:
                            level_display_name = new_logs.get('LevelDisplayName')

                            year = datetime.fromtimestamp(int(re.search(r'\d+', timestamp).group())/1000).strftime('%Y')

                            if level_display_name in ['Information', 'Error', 'Warning']:
                                if year in level_display_counts:
                                    level_display_counts[year][level_display_name] += 1
                                    level_display_counts['all_years'][level_display_name] += 1
                        
                        else:
                            for l in new_logs:
                                log = l['Event']['System']
                                level_display_name = l.get('LevelDisplayName', 'Unknown')
                                timestamp = log['TimeCreated']['@SystemTime']
                                year = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S.%f').year

                                if level_display_name in ['Information', 'Error', 'Warning']:
                                    if year in level_display_counts:
                                        level_display_counts[year][level_display_name] += 1
                                        level_display_counts['all_years'][level_display_name] += 1

                        yield f"data: {json.dumps({'counts': log_counts, 'yearCounts': year_counts, 'nameCounts': name_counts, 'tenHourCount': tf_hour_counts, 'dailyEventCounts': daily_event_counts, 'all_year_split_counts': level_display_counts,'levelDisplayCounts': level_display_counts, 'newLogs': new_logs})}\n\n"
                    time.sleep(10000000)

            return Response(generate(), mimetype="text/event-stream")

        