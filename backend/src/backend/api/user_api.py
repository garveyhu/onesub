from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.order import Order
from backend.models.ticket import Ticket
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


def _build_self_update_dto(dto: UserUpdateDTO) -> UserUpdateDTO:
    """过滤普通用户可修改字段，仅保留基础资料和密码。"""
    return UserUpdateDTO(
        username=dto.username,
        password=dto.password,
        email=dto.email,
    )


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
    """获取当前用户基础资料。"""
    return Result.ok(UserVO.model_validate(current_user))


@router.get("/profile/summary")
def get_profile_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户个人中心摘要。"""
    completed_statuses = ["paid", "processing", "completed", "refunded"]
    return Result.ok(
        {
            "user": UserVO.model_validate(current_user),
            "order_count": db.query(func.count(Order.id))
            .filter(Order.user_id == current_user.id)
            .scalar()
            or 0,
            "completed_order_count": db.query(func.count(Order.id))
            .filter(
                Order.user_id == current_user.id,
                Order.status.in_(completed_statuses),
            )
            .scalar()
            or 0,
            "open_ticket_count": db.query(func.count(Ticket.id))
            .filter(
                Ticket.user_id == current_user.id,
                Ticket.status.in_(["open", "processing"]),
            )
            .scalar()
            or 0,
        }
    )


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
    update_dto = dto if current_user.is_admin else _build_self_update_dto(dto)
    user = UserService.update(db, user_id, update_dto)
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
