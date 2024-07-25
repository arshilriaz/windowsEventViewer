from flask import Flask

def create_app():
    app = Flask(__name__)
    app.secret_key = "0k:(7o%MZ|SD/Qw.L21dWJ9BY@}%QX"
    
    # Register blueprints
    from .views import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app
