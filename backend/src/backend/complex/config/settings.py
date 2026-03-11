from dotenv import load_dotenv

from .base_settings import BaseSettings
from .constants import CONFIG_PATH

load_dotenv(CONFIG_PATH / ".env")


class AppSettings(BaseSettings):
    """应用配置"""

    def __init__(self):
        super().__init__()
        self.data = self.from_json(CONFIG_PATH / "app.json").data


class ComponentSettings(BaseSettings):
    """组件配置（数据库、Redis 等）"""

    def __init__(self):
        super().__init__()
        self.data = self.from_json(CONFIG_PATH / "component.json").data


app_settings = AppSettings()
component_settings = ComponentSettings()
