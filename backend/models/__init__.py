from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
socketio = SocketIO(cors_allowed_origins="*")


def init_app(app):
    """Initialize all extensions with the Flask app"""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    socketio.init_app(app)
