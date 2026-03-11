from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.auth_util import create_access_token
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
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
    user = UserService.create(db, dto)
    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))


@router.post("/login")
def login(dto: LoginDTO, db: Session = Depends(get_db)):
    user = UserService.get_by_username(db, dto.username)
    if not user or not UserService.verify_password(dto.password, user.password_hash):
        raise CustomException(ResultCode.UNAUTHORIZED, "用户名或密码错误")
    if not user.is_active:
        raise CustomException(ResultCode.FORBIDDEN, "账号已被禁用")

    token = create_access_token(user.username)
    return Result.ok(LoginVO(token=token, user=UserVO.model_validate(user)))
