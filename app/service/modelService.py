import requests
import json 

def add_machine(hostname, username, password):
    url = 'http://localhost:5000/add_machine'  # Adjust the URL based on where your Flask app is hosted
    data = {
        'hostname': hostname,
        'username': username,
        'password': password
    }
    response = requests.post(url, data=data)
    return response.text

def list_machines():
    url = 'http://localhost:5000/machines'
    response = requests.get(url)
    return response.text

def add_events(machine_id, events):
    url = 'http://localhost:5000/add_events'
    for event in events:
        event['machine_id'] = machine_id  # Ensure all events have the machine_id set
    response = requests.post(url, json={'events': events})
    return response.text

def list_events():
    url = 'http://localhost:5000/events'
    response = requests.get(url)
    return response.text

def add_machine_and_event(hostname, username, password, application):
    # Add machine
    machine_response = add_machine(hostname, username, password)
    if 'machine_id' not in machine_response:
        return "Failed to add machine"

    # Extract machine_id from machine response
    # This assumes that the add_machine API returns the machine_id in its response
    machine_response_json = json.loads(machine_response)
    machine_id = machine_response_json['machine_id']

    # Add event linked to the machine
    event_response = add_events(machine_id, application)

    if 'success' not in event_response:
        return "Failed to add event"

    return "Machine and event added successfully"