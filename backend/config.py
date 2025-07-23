import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key"
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "jwt-secret-key"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)

    # Database
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL") or "sqlite:///spolujizda.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Email
    MAIL_SERVER = os.environ.get("MAIL_SERVER")
    MAIL_PORT = int(os.environ.get("MAIL_PORT") or 587)
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() in ["true", "on", "1"]
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")

    # Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = "uploads"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
