from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.complex.auth.auth_util import create_access_token
from backend.complex.database import get_db
from backend.complex.password_validator import validate_password_strength
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.login_log import LoginLog
from backend.modules.user.schemas.user_dto import (
    LoginDTO,
    LoginVO,
    UserCreateDTO,
    UserVO,
)
from backend.modules.user.service.user_service import UserService

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register")
def register(dto: UserCreateDTO, db: Session = Depends(get_db)):
    # 密码强度校验
    error = validate_password_strength(dto.password)
    if error:
        raise CustomException(ResultCode.FAIL, error)
    user = UserService.create(db, dto)
    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))


@router.post("/login")
def login(dto: LoginDTO, request: Request, db: Session = Depends(get_db)):
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    ua = request.headers.get("User-Agent", "")

    user = UserService.get_by_username(db, dto.username)
    if not user or not UserService.verify_password(dto.password, user.password_hash):
        # 记录失败登录
        db.add(LoginLog(
            user_id=user.id if user else None,
            username=dto.username,
            ip=ip,
            user_agent=ua[:500],
            success=False,
            fail_reason="用户名或密码错误",
        ))
        db.commit()
        raise CustomException(ResultCode.UNAUTHORIZED, "用户名或密码错误")
    if not user.is_active:
        db.add(LoginLog(
            user_id=user.id,
            username=dto.username,
            ip=ip,
            user_agent=ua[:500],
            success=False,
            fail_reason="账号已被禁用",
        ))
        db.commit()
        raise CustomException(ResultCode.FORBIDDEN, "账号已被禁用")

    # 记录成功登录
    db.add(LoginLog(
        user_id=user.id,
        username=user.username,
        ip=ip,
        user_agent=ua[:500],
        success=True,
    ))
    db.commit()

    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))
