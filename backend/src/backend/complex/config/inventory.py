import os

from .settings import app_settings, component_settings


class AppSettings:
    """应用配置访问类"""

    LOG_LEVEL = os.getenv("LOG_LEVEL") or app_settings.get("LOG_LEVEL") or "INFO"
    APP_NAME = app_settings.get("APP_NAME") or "onesub"
    SECRET_KEY = (
        os.getenv("SECRET_KEY")
        or app_settings.get("SECRET_KEY")
        or "onesub-secret-key-change-me"
    )


class DatabaseSettings:
    """数据库配置访问类"""

    _cached_url = None

    @staticmethod
    def get_type() -> str:
        return component_settings.get("database.type") or "sqlite"

    @staticmethod
    def get_url() -> str:
        if DatabaseSettings._cached_url:
            return DatabaseSettings._cached_url

        db_type = DatabaseSettings.get_type()
        if db_type == "sqlite":
            path = (
                component_settings.get("database.sqlite.path") or "sqlite:///./data.db"
            )
            DatabaseSettings._cached_url = path
        elif db_type == "mysql":
            import urllib.parse

            host = (
                os.getenv("MYSQL_HOST")
                or component_settings.get("database.mysql.host")
                or "127.0.0.1"
            )
            port = int(
                os.getenv("MYSQL_PORT")
                or component_settings.get("database.mysql.port")
                or 3306
            )
            db = (
                os.getenv("MYSQL_DB")
                or component_settings.get("database.mysql.db")
                or "onesub"
            )
            user = (
                os.getenv("MYSQL_USER")
                or component_settings.get("database.mysql.user")
                or "root"
            )
            password = (
                os.getenv("MYSQL_PASSWORD")
                or component_settings.get("database.mysql.password")
                or ""
            )
            encoded_user = urllib.parse.quote_plus(user)
            encoded_password = urllib.parse.quote_plus(password)
            DatabaseSettings._cached_url = f"mysql+pymysql://{encoded_user}:{encoded_password}@{host}:{port}/{db}?charset=utf8mb4"
        return DatabaseSettings._cached_url

    @staticmethod
    def is_sqlite() -> bool:
        return DatabaseSettings.get_type() == "sqlite"
