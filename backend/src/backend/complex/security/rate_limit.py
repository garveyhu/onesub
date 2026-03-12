from collections import deque

from backend.complex.time_util import now_cst

_rate_limit_store: dict[str, deque[float]] = {}


def check_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """检查当前 key 是否超过限流阈值。"""
    bucket = _rate_limit_store.setdefault(key, deque())
    now = now_cst().timestamp()
    window_start = now - window_seconds
    while bucket and bucket[0] < window_start:
        bucket.popleft()
    if len(bucket) >= limit:
        retry_after = max(int(bucket[0] + window_seconds - now), 1)
        return False, retry_after
    bucket.append(now)
    return True, 0
