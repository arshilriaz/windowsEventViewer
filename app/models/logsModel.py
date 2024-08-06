# # app/models/userModel.py
# from app import db
# from sqlalchemy import Sequence

# class MachineDetails(db.Model):
#     __tablename__ = 'machine_details'
#     machine_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
#     hostname = db.Column(db.String(255), nullable=False)
#     username = db.Column(db.String(255), nullable=False)
#     password = db.Column(db.String(255), nullable=False)  # Consider encrypting this field

#     # Relationship to Event
#     events = db.relationship('Event', backref='machine', lazy=True)

# class Event(db.Model):
#     __tablename__ = 'event'
#     id = db.Column(db.Integer, primary_key=True, autoincrement=True)
#     event_id = db.Column(db.Integer)
#     machine_id = db.Column(db.Integer, db.ForeignKey('machine_details.machine_id'), nullable=False)
#     event_source_name = db.Column(db.String(100))
#     source = db.Column(db.String(100))
#     time_created = db.Column(db.DateTime, nullable=False)
#     # event_code = db.Column(db.String(50), nullable=False)
#     # event_qualifiers = db.Column(db.String(50))
#     # version = db.Column(db.String(50))
#     # level = db.Column(db.String(50))
#     # task = db.Column(db.String(50))
#     # opcode = db.Column(db.String(50))
#     # keywords = db.Column(db.String(255))
    
#     # event_record_id = db.Column(db.String(50))
#     # event_data = db.Column(db.Text)