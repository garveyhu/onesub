from typing import Any

from sqlalchemy.orm import Session

from backend.models.site_setting import SiteSetting

PUBLIC_SITE_URL = "https://sub.kerwin.cloud"
DEFAULT_BACKUP_DIRECTORY = "./data/backups"
LEGACY_PUBLIC_BASE_URLS = {
    "http://localhost:5173",
    "http://localhost:5173/#",
    "https://sub.kerwin.cloud/#",
}
LEGACY_BACKUP_DIRECTORIES = {
    "./backups",
    "backups",
}

DEFAULT_SITE_SETTINGS: dict[str, dict[str, str]] = {
    "site_name": {"value": "OneSub", "description": "站点名称"},
    "site_description": {"value": "全球顶级 AI 订阅服务", "description": "站点描述"},
    "public_base_url": {"value": PUBLIC_SITE_URL, "description": "公开访问地址"},
    "contact_wechat": {"value": "", "description": "客服微信号"},
    "payment_qrcode": {"value": "", "description": "支付二维码 URL"},
    "order_timeout_hours": {"value": "2", "description": "待支付订单超时小时数"},
    "invite_reward_enabled": {"value": "true", "description": "是否启用邀请奖励"},
    "invite_reward_mode": {"value": "coupon", "description": "邀请奖励类型 cash/coupon"},
    "invite_reward_amount": {"value": "20", "description": "邀请奖励金额"},
    "captcha_enabled": {"value": "true", "description": "登录注册是否启用验证码"},
    "auth_rate_limit_window_seconds": {"value": "600", "description": "认证限流时间窗秒数"},
    "auth_rate_limit_max_requests": {"value": "20", "description": "认证限流最大请求数"},
    "backup_enabled": {"value": "false", "description": "是否启用数据库备份"},
    "backup_directory": {"value": DEFAULT_BACKUP_DIRECTORY, "description": "SQLite 备份目录"},
    "backup_interval_hours": {"value": "24", "description": "数据库备份间隔小时"},
    "report_daily_enabled": {"value": "false", "description": "是否启用每日经营报告"},
    "report_weekly_enabled": {"value": "false", "description": "是否启用每周经营报告"},
    "report_send_hour": {"value": "9", "description": "报告发送小时"},
    "report_recipient_email": {"value": "", "description": "经营报告接收邮箱"},
    "smtp_host": {"value": "", "description": "SMTP 服务器地址"},
    "smtp_port": {"value": "465", "description": "SMTP 端口"},
    "smtp_user": {"value": "", "description": "SMTP 用户名"},
    "smtp_password": {"value": "", "description": "SMTP 密码"},
    "smtp_from_email": {"value": "", "description": "发件人邮箱"},
    "email_notification_enabled": {"value": "false", "description": "是否启用邮件通知"},
    "alipay_face_to_face_enabled": {"value": "false", "description": "是否启用支付宝当面付"},
    "wechat_pay_enabled": {"value": "false", "description": "是否启用微信支付"},
    "telegram_bot_enabled": {"value": "false", "description": "是否启用 Telegram Bot"},
    "telegram_bot_name": {"value": "", "description": "Telegram Bot 名称"},
}


def ensure_default_settings(db: Session) -> None:
    """确保系统默认配置存在。"""
    existing_items = {item.key: item for item in db.query(SiteSetting).all()}
    should_commit = False

    for key, config in DEFAULT_SITE_SETTINGS.items():
        item = existing_items.get(key)
        if item:
            if (
                key == "public_base_url"
                and item.value
                and item.value.strip() in LEGACY_PUBLIC_BASE_URLS
            ):
                item.value = config["value"]
                should_commit = True
            if (
                key == "backup_directory"
                and (not item.value or item.value.strip() in LEGACY_BACKUP_DIRECTORIES)
            ):
                item.value = config["value"]
                should_commit = True
            continue

        db.add(
            SiteSetting(
                key=key,
                value=config["value"],
                description=config["description"],
            )
        )
        should_commit = True

    if should_commit:
        db.commit()


def get_setting(db: Session, key: str, default: str = "") -> str:
    """读取站点配置，不存在时返回默认值。"""
    ensure_default_settings(db)
    item = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return item.value if item and item.value is not None else default


def get_bool_setting(db: Session, key: str, default: bool = False) -> bool:
    """读取布尔配置。"""
    value = get_setting(db, key, str(default).lower()).strip().lower()
    return value in {"1", "true", "yes", "on"}


def get_int_setting(db: Session, key: str, default: int) -> int:
    """读取整型配置，异常时回退默认值。"""
    try:
        return int(get_setting(db, key, str(default)).strip())
    except ValueError:
        return default


def get_float_setting(db: Session, key: str, default: float) -> float:
    """读取浮点配置，异常时回退默认值。"""
    try:
        return float(get_setting(db, key, str(default)).strip())
    except ValueError:
        return default


def dump_public_settings(db: Session) -> dict[str, Any]:
    """返回前端需要的公开配置。"""
    public_keys = [
        "site_name",
        "site_description",
        "contact_wechat",
        "payment_qrcode",
        "public_base_url",
        "captcha_enabled",
        "alipay_face_to_face_enabled",
        "wechat_pay_enabled",
    ]
    ensure_default_settings(db)
    items = db.query(SiteSetting).filter(SiteSetting.key.in_(public_keys)).all()
    return {item.key: item.value for item in items}
