from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.complex.site_setting_util import (
    dump_public_settings,
    ensure_default_settings,
)
from backend.models.site_setting import SiteSetting
from backend.models.user import User

router = APIRouter(prefix="/setting", tags=["站点设置"])


class SettingUpdateItem(BaseModel):
    key: str
    value: str


class SettingBatchUpdateDTO(BaseModel):
    items: List[SettingUpdateItem]


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("")
def get_public_settings(db: Session = Depends(get_db)):
    """获取前端可公开读取的站点配置。"""
    return Result.ok(dump_public_settings(db))


@router.get("/admin/list")
def admin_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员查看全部站点配置。"""
    _check_admin(current_user)
    ensure_default_settings(db)
    items = db.query(SiteSetting).order_by(SiteSetting.id.asc()).all()
    return Result.ok(
        [
            {
                "id": item.id,
                "key": item.key,
                "value": item.value,
                "description": item.description,
            }
            for item in items
        ]
    )


@router.post("/admin/update")
def admin_update(
    dto: SettingBatchUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员批量更新站点配置。"""
    _check_admin(current_user)
    ensure_default_settings(db)
    for item in dto.items:
        setting = db.query(SiteSetting).filter(SiteSetting.key == item.key).first()
        if setting:
            setting.value = item.value
    db.commit()
    return Result.ok()
