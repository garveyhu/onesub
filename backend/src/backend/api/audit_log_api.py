from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.audit_log import AuditLog
from backend.models.login_log import LoginLog
from backend.models.user import User

router = APIRouter(prefix="/audit", tags=["审计"])


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/admin/list")
def admin_list_audit_logs(
    username: Optional[str] = Query(None, description="按操作人筛选"),
    action: Optional[str] = Query(None, description="按操作类型筛选"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：查看操作日志"""
    _check_admin(current_user)
    query = db.query(AuditLog)
    if username:
        query = query.filter(AuditLog.username.contains(username))
    if action:
        query = query.filter(AuditLog.action.contains(action))

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Result.ok({
        "total": total,
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "username": item.username,
                "action": item.action,
                "target_type": item.target_type,
                "target_id": item.target_id,
                "detail": item.detail,
                "ip": item.ip,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
    })


@router.get("/admin/login-logs")
def admin_list_login_logs(
    username: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：查看登录日志"""
    _check_admin(current_user)
    query = db.query(LoginLog)
    if username:
        query = query.filter(LoginLog.username.contains(username))

    total = query.count()
    items = (
        query.order_by(LoginLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Result.ok({
        "total": total,
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "username": item.username,
                "ip": item.ip,
                "user_agent": item.user_agent,
                "success": item.success,
                "fail_reason": item.fail_reason,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
    })
