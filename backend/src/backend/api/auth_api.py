from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.complex.auth.auth_util import create_access_token
from backend.complex.database import get_db
from backend.complex.password_validator import validate_password_strength
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.complex.security.captcha import verify_captcha
from backend.complex.security.rate_limit import check_rate_limit
from backend.complex.site_setting_util import get_bool_setting, get_int_setting
from backend.modules.user.schemas.user_dto import (
    LoginDTO,
    LoginVO,
    UserCreateDTO,
    UserVO,
)
from backend.modules.user.service.user_service import UserService

router = APIRouter(prefix="/auth", tags=["认证"])


def _get_request_ip(request: Request) -> str:
    """提取客户端 IP，优先使用反向代理透传头。"""
    return request.headers.get(
        "X-Forwarded-For",
        request.client.host if request.client else "unknown",
    )


def _check_auth_rate_limit(db: Session, request: Request, action: str) -> None:
    """对认证接口执行按 IP 的限流。"""
    window_seconds = get_int_setting(db, "auth_rate_limit_window_seconds", 600)
    limit = get_int_setting(db, "auth_rate_limit_max_requests", 20)
    allowed, retry_after = check_rate_limit(
        key=f"{action}:{_get_request_ip(request)}",
        limit=limit,
        window_seconds=window_seconds,
    )
    if allowed:
        return
    raise CustomException(ResultCode.FAIL, f"请求过于频繁，请 {retry_after} 秒后再试")


def _check_captcha(
    db: Session,
    captcha_id: str | None,
    captcha_code: str | None,
) -> None:
    """当站点开启验证码时校验验证码。"""
    if not get_bool_setting(db, "captcha_enabled", True):
        return
    if verify_captcha(captcha_id, captcha_code):
        return
    raise CustomException(ResultCode.FAIL, "验证码错误或已过期")


@router.post("/register")
def register(
    dto: UserCreateDTO,
    request: Request,
    db: Session = Depends(get_db),
):
    """注册账号并返回登录态。"""
    _check_auth_rate_limit(db, request, "register")
    _check_captcha(db, dto.captcha_id, dto.captcha_code)
    error = validate_password_strength(dto.password)
    if error:
        raise CustomException(ResultCode.FAIL, error)

    user = UserService.create(db, dto)
    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))


@router.post("/login")
def login(
    dto: LoginDTO,
    request: Request,
    db: Session = Depends(get_db),
):
    """登录并返回 JWT。"""
    _check_auth_rate_limit(db, request, "login")
    _check_captcha(db, dto.captcha_id, dto.captcha_code)

    user = UserService.get_by_username(db, dto.username)
    if not user or not UserService.verify_password(dto.password, user.password_hash):
        raise CustomException(ResultCode.UNAUTHORIZED, "用户名或密码错误")
    if not user.is_active:
        raise CustomException(ResultCode.FORBIDDEN, "账号已被禁用")

    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))
