from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.complex.auth.auth_util import verify_and_get_user
from backend.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> User:
    """FastAPI 依赖注入：验证 Token 并返回当前用户"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    user = verify_and_get_user(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
