from datetime import datetime, timedelta, timezone

CST = timezone(timedelta(hours=8))


def now_cst() -> datetime:
    """返回东八区当前时间。"""
    return datetime.now(tz=CST)


def ensure_cst(value: datetime | None) -> datetime | None:
    """将数据库中的时间统一转换为东八区时间。"""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=CST)
    return value.astimezone(CST)
