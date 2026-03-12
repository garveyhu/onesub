from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.complex.system.ops_util import (
    build_business_report,
    create_sqlite_backup,
    get_health_snapshot,
    list_backups,
    send_business_report_email,
)
from backend.complex.system.runtime_state import APP_STARTED_AT
from backend.models.user import User

router = APIRouter(prefix="/ops", tags=["运维"])


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/health")
def get_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取系统健康检查信息。"""
    _check_admin(current_user)
    return Result.ok(get_health_snapshot(db, APP_STARTED_AT.isoformat()))


@router.post("/backup/run")
def run_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """手动触发数据库备份。"""
    _check_admin(current_user)
    backup = create_sqlite_backup(db)
    if not backup:
        raise CustomException(ResultCode.FAIL, "当前未启用 SQLite 备份")
    return Result.ok(backup)


@router.get("/backup/list")
def get_backup_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """查看数据库备份历史。"""
    _check_admin(current_user)
    return Result.ok(list_backups(db))


@router.get("/report/preview")
def preview_report(
    days: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """预览每日/每周经营报告。"""
    _check_admin(current_user)
    return Result.ok(build_business_report(db, days=days))


@router.post("/report/send")
def send_report(
    days: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """手动发送经营报告。"""
    _check_admin(current_user)
    report = build_business_report(db, days=days)
    success = send_business_report_email(db, report, f"OneSub 经营报告（最近 {days} 天）")
    return Result.ok({"sent": success, "report": report})
