from flask import Flask
# from flask_sqlalchemy import SQLAlchemy
# from flask_migrate import Migrate
# from flask_restx import Api

# db = SQLAlchemy()

def create_app():
    app = Flask(__name__, static_folder='templates')
    app.secret_key = "0k:(7o%MZ|SD/Qw.L21dWJ9BY@}%QX"
    # app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:3855@localhost/llmDB'
    # app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # db.init_app(app)  # Initialize app for db
    # migrate = Migrate(app, db)

    # from .models.logsModel import MachineDetails, Event

    # with app.app_context():
    #     db.create_all()  # Create all database tables

    # api = Api(app, version='1.0', title='My API', description='A simple API')

    from .views.controllerViews import main as main_blueprint
    # from .views.modelViews import main as model_views_blueprint  # Import the Blueprint

    # api.add_namespace(main_blueprint, path='/controller')
    # api.add_namespace(model_views_blueprint, path='/model')

    app.register_blueprint(main_blueprint)  
    # app.register_blueprint(model_views_blueprint) 

    return app
