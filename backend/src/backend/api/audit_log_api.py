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
                "id": l.id,
                "user_id": l.user_id,
                "username": l.username,
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "detail": l.detail,
                "ip": l.ip,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in items
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
                "id": l.id,
                "user_id": l.user_id,
                "username": l.username,
                "ip": l.ip,
                "user_agent": l.user_agent,
                "success": l.success,
                "fail_reason": l.fail_reason,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in items
        ],
    })
