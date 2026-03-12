"""Password validation utility."""

import re


def validate_password_strength(password: str) -> str | None:
    """
    Validate password strength. Returns error message if invalid, None if valid.
    Rules:
    - At least 6 characters
    - Contains at least one letter and one digit
    """
    if len(password) < 6:
        return "密码长度至少 6 位"
    if not re.search(r"[a-zA-Z]", password):
        return "密码必须包含至少一个字母"
    if not re.search(r"\d", password):
        return "密码必须包含至少一个数字"
    return None
