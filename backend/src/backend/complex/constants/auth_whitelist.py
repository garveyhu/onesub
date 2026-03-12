class AuthWhitelist:
    """认证白名单：这些路由跳过 JWT 验证"""

    _WHITELIST = [
        "/auth/login",
        "/auth/register",
        "/security",
        "/plan",
        "/announcement",
        "/setting",
        "/coupon/check",
        "/health",
        "/ping",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    @classmethod
    def is_whitelisted(cls, path: str) -> bool:
        return any(path.startswith(route) for route in cls._WHITELIST)

    @classmethod
    def get_all(cls) -> list[str]:
        return cls._WHITELIST.copy()
