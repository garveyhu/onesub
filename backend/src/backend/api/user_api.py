from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.user import User
from backend.modules.user.schemas.user_dto import (
    AdminResetPasswordDTO,
    UserUpdateDTO,
    UserVO,
)
from backend.modules.user.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["用户"])


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


# ---- 管理员接口 ----


@router.get("/admin/list")
def admin_list_users(
    username: Optional[str] = Query(None, description="按用户名搜索"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：用户列表（支持搜索）"""
    _check_admin(current_user)
    users = UserService.list(db, username_filter=username)
    return Result.ok([UserVO.model_validate(u) for u in users])


@router.post("/admin/{user_id}/toggle-admin")
def admin_toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：切换用户管理员身份"""
    _check_admin(current_user)
    if current_user.id == user_id:
        raise CustomException(ResultCode.FAIL, "不能修改自己的管理员身份")
    user = UserService.get_by_id(db, user_id)
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return Result.ok(UserVO.model_validate(user))


@router.post("/admin/{user_id}/toggle-active")
def admin_toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：启用/禁用用户"""
    _check_admin(current_user)
    if current_user.id == user_id:
        raise CustomException(ResultCode.FAIL, "不能禁用自己的账号")
    user = UserService.get_by_id(db, user_id)
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return Result.ok(UserVO.model_validate(user))


@router.post("/admin/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    dto: AdminResetPasswordDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：重置用户密码"""
    _check_admin(current_user)
    user = UserService.get_by_id(db, user_id)
    user.password_hash = UserService.hash_password(dto.new_password)
    db.commit()
    return Result.ok()


# ---- 用户接口 ----


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return Result.ok(UserVO.model_validate(current_user))


@router.post("/{user_id}/update")
def update_user(
    user_id: int,
    dto: UserUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新用户（管理员或本人）"""
    if not current_user.is_admin and current_user.id != user_id:
        raise CustomException(ResultCode.FORBIDDEN, "无权操作")
    user = UserService.update(db, user_id, dto)
    return Result.ok(UserVO.model_validate(user))


@router.post("/{user_id}/delete")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除用户（仅管理员）"""
    _check_admin(current_user)
    if current_user.id == user_id:
        raise CustomException(ResultCode.FAIL, "不能删除自己")
    UserService.delete(db, user_id)
    return Result.ok()
