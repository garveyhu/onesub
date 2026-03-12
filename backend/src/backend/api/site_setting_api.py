from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.complex.audit import log_audit
from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.site_setting import SiteSetting
from backend.models.user import User

router = APIRouter(prefix="/setting", tags=["站点设置"])

# 默认配置项（首次启动时自动初始化）
DEFAULT_SETTINGS = [
    {"key": "site_name", "value": "OneSub", "description": "站点名称"},
    {"key": "site_description", "value": "全球顶级 AI 订阅服务", "description": "站点描述"},
    {"key": "contact_wechat", "value": "", "description": "客服微信号"},
    {"key": "payment_qrcode", "value": "", "description": "支付二维码URL"},
    {"key": "smtp_host", "value": "", "description": "SMTP 服务器地址"},
    {"key": "smtp_port", "value": "465", "description": "SMTP 端口"},
    {"key": "smtp_user", "value": "", "description": "SMTP 用户名"},
    {"key": "smtp_password", "value": "", "description": "SMTP 密码"},
    {"key": "smtp_from_email", "value": "", "description": "发件人邮箱"},
    {"key": "email_notification_enabled", "value": "false", "description": "是否启用邮件通知"},
]


class SettingUpdateItem(BaseModel):
    key: str
    value: str


class SettingBatchUpdateDTO(BaseModel):
    items: List[SettingUpdateItem]


def _ensure_defaults(db: Session):
    """确保默认配置项存在"""
    existing_keys = {s.key for s in db.query(SiteSetting.key).all()}
    for item in DEFAULT_SETTINGS:
        if item["key"] not in existing_keys:
            db.add(SiteSetting(**item))
    db.commit()


# ---- 公开接口 ----


@router.get("")
def get_public_settings(db: Session = Depends(get_db)):
    """获取前端需要的公开配置"""
    _ensure_defaults(db)
    public_keys = ["site_name", "site_description", "contact_wechat", "payment_qrcode"]
    items = db.query(SiteSetting).filter(SiteSetting.key.in_(public_keys)).all()
    return Result.ok({s.key: s.value for s in items})


# ---- 管理员接口 ----


@router.get("/admin/list")
def admin_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_admin(current_user)
    _ensure_defaults(db)
    items = db.query(SiteSetting).order_by(SiteSetting.id.asc()).all()
    return Result.ok([
        {
            "id": s.id,
            "key": s.key,
            "value": s.value,
            "description": s.description,
        }
        for s in items
    ])


@router.post("/admin/update")
def admin_update(
    dto: SettingBatchUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_admin(current_user)
    changed = []
    for item in dto.items:
        setting = db.query(SiteSetting).filter(SiteSetting.key == item.key).first()
        if setting:
            setting.value = item.value
            changed.append(item.key)
    db.commit()
    log_audit(db, current_user.id, current_user.username, "更新站点设置", "setting", None, f"更新了 {', '.join(changed)}")
    return Result.ok()


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")
