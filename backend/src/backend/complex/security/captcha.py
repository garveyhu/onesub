import html
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from random import randint

from backend.complex.time_util import now_cst


@dataclass
class CaptchaItem:
    captcha_id: str
    code: str
    text: str
    expires_at: datetime


_captcha_store: dict[str, CaptchaItem] = {}


def _clear_expired() -> None:
    """删除已过期验证码，避免内存持续增长。"""
    now = now_cst()
    expired_keys = [
        captcha_id
        for captcha_id, item in _captcha_store.items()
        if item.expires_at <= now
    ]
    for captcha_id in expired_keys:
        _captcha_store.pop(captcha_id, None)


def create_captcha() -> dict[str, str | int]:
    """生成简单算术验证码与 SVG 图片。"""
    _clear_expired()
    left = randint(1, 9)
    right = randint(1, 9)
    captcha_id = uuid.uuid4().hex
    text = f"{left} + {right} = ?"
    code = str(left + right)
    item = CaptchaItem(
        captcha_id=captcha_id,
        code=code,
        text=text,
        expires_at=now_cst() + timedelta(minutes=5),
    )
    _captcha_store[captcha_id] = item
    return {
        "captcha_id": captcha_id,
        "image_data": _build_svg_data_uri(text),
        "expires_in": 300,
    }


def verify_captcha(captcha_id: str | None, code: str | None) -> bool:
    """校验验证码并在成功后销毁。"""
    _clear_expired()
    if not captcha_id or not code:
        return False
    item = _captcha_store.get(captcha_id)
    if not item:
        return False
    matched = item.code == code.strip()
    if matched:
        _captcha_store.pop(captcha_id, None)
    return matched


def _build_svg_data_uri(text: str) -> str:
    """将验证码内容渲染为内联 SVG，方便前端直接展示。"""
    escaped = html.escape(text)
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='56' viewBox='0 0 160 56'>"
        "<rect width='160' height='56' rx='12' fill='#e0f2fe'/>"
        "<rect x='4' y='4' width='152' height='48' rx='10' fill='#ffffff' stroke='#7dd3fc'/>"
        "<text x='80' y='35' text-anchor='middle' font-size='22' font-family='monospace' "
        "font-weight='700' fill='#0f172a'>"
        f"{escaped}"
        "</text>"
        "</svg>"
    )
    return f"data:image/svg+xml;utf8,{svg}"
