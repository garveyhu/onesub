import datetime
from typing import Optional

import jwt
from sqlalchemy.orm import Session

from backend.complex.config.inventory import AppSettings
from backend.complex.database import SessionLocal
from backend.models.user import User

SECRET_KEY = AppSettings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小时


def create_access_token(username: str) -> str:
    """生成 JWT Token"""
    payload = {
        "sub": username,
        "exp": datetime.datetime.utcnow()
        + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """验证 Token，返回 username；失败返回 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None


def verify_and_get_user(token: str) -> Optional[User]:
    """验证 Token 并返回 User 对象"""
    username = verify_token(token)
    if not username:
        return None
    db: Session = SessionLocal()
    try:
        return db.query(User).filter(User.username == username).first()
    finally:
        db.close()
