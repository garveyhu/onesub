import json
from pathlib import Path

import yaml
from dotenv import dotenv_values


class BaseSettings:
    def __init__(self, data=None):
        self.data = {} if data is None else data

    def __getitem__(self, key):
        return self.get(key)

    def get(self, key):
        keys = key.split(".")
        result = self.data
        for k in keys:
            result = result.get(k, {})
        return result

    def __setitem__(self, key, value):
        self.set(key, value)

    def set(self, key, value):
        keys = key.split(".")
        current = self.data
        for k in keys[:-1]:
            current = current.setdefault(k, {})
        current[keys[-1]] = value

    def to_dict(self):
        return self.data

    @classmethod
    def from_env(cls, env_path: Path):
        data = dotenv_values(env_path)
        return BaseSettings(data)

    @classmethod
    def from_json(cls, json_path: Path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return BaseSettings(data)

    @classmethod
    def from_yaml(cls, yaml_path: Path):
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return BaseSettings(data)
