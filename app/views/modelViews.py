# from flask import Blueprint, request, jsonify
# from app.models.logsModel import MachineDetails, Event 
# from app import db

# main = Blueprint('model_views', __name__)  # Rename Blueprint to avoid confusion with other views

# # @main.route('/add_user', methods=['POST'])
# # def add_user():
# #     username = request.form['username']
# #     email = request.form['email']
# #     new_user = User(username=username, email=email)
# #     db.session.add(new_user)
# #     db.session.commit()
# #     return f'User {username} added.'

# # @main.route('/users', methods=['GET'])
# # def list_users():
# #     users = User.query.all()
# #     return '<br>'.join([user.username for user in users])

# @main.route('/add_machine', methods=['POST'])
# def add_machine():
#     try:
#         # Retrieve data from form or json
#         if request.is_json:
#             data = request.get_json()
#         else:
#             data = request.form

#         hostname = data.get('hostname')
#         username = data.get('username')
#         password = data.get('password')

#         # Create a new MachineDetails instance
#         new_machine = MachineDetails(hostname=hostname, username=username, password=password)
#         db.session.add(new_machine)
#         db.session.commit()

#         # Return the machine ID as part of the response
#         return jsonify({'message': 'New machine added', 'machine_id': new_machine.machine_id}), 201
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({'error': str(e)}), 500

# # @main.route('/machines', methods=['GET'])
# # def list_machines():
# #     machines = MachineDetails.query.all()
# #     return '<br>'.join([machine.hostname for machine in machines])

# @main.route('/add_events', methods=['POST'])
# def add_events():
#     data = request.get_json()
#     events = [
#         Event(
#             machine_id = event['machine_id'],
#             event_id = event['Event']['System']['EventID']['#text'],
#             source = event['Event']['System']['Source'],
#             event_source_name = event['Event']['System']['Provider']['@Name'],
#             time_created = event['Event']['System']['TimeCreated']['@SystemTime']
#         ) for event in data['events']
#     ]
#     try:
#         db.session.bulk_save_objects(events)
#         db.session.commit()
#         return jsonify({'message': 'Events added successfully', 'success': True}), 201
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({'error': str(e), 'success': False}), 500
    
# # @main.route('/events', methods=['GET'])
# # def list_events():
# #     events = Event.query.all()
# #     return '<br>'.join([f'Event ID: {event.event_id}, Code: {event.event_code}' for event in events])
