from fastapi import APIRouter

from backend.complex.response.result import Result
from backend.complex.security.captcha import create_captcha

router = APIRouter(prefix="/security", tags=["安全"])


@router.get("/captcha")
def get_captcha():
    """生成登录/注册验证码。"""
    return Result.ok(create_captcha())
