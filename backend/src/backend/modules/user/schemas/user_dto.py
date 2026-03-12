from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserVO(BaseModel):
    """用户视图对象（响应）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    is_admin: bool
    subscription_expires_at: Optional[datetime] = Field(None, description="订阅到期时间")
    invite_code: str = Field(description="邀请码")
    reward_balance: float = Field(description="返利余额")
    created_at: datetime = Field(description="创建时间")


class UserCreateDTO(BaseModel):
    """创建用户（必填字段）"""

    username: str = Field(description="用户名，唯一")
    password: str = Field(description="明文密码，服务层负责加密")
    email: Optional[str] = Field(None, description="邮箱")
    invite_code: Optional[str] = Field(None, description="邀请码")
    captcha_id: Optional[str] = Field(None, description="验证码 ID")
    captcha_code: Optional[str] = Field(None, description="验证码答案")


class UserUpdateDTO(BaseModel):
    """更新用户（所有字段 Optional，只传要改的）"""

    username: Optional[str] = Field(None, description="用户名")
    password: Optional[str] = Field(None, description="新密码")
    email: Optional[str] = Field(None, description="邮箱")
    is_active: Optional[bool] = Field(None, description="是否启用")
    subscription_expires_at: Optional[datetime] = Field(None, description="订阅到期时间")


class AdminResetPasswordDTO(BaseModel):
    """管理员重置用户密码"""

    new_password: str = Field(description="新密码", min_length=6)


class LoginDTO(BaseModel):
    """登录请求"""

    username: str = Field(description="用户名")
    password: str = Field(description="密码")
    captcha_id: Optional[str] = Field(None, description="验证码 ID")
    captcha_code: Optional[str] = Field(None, description="验证码答案")


class LoginVO(BaseModel):
    """登录响应"""

    token: str = Field(description="JWT Token")
    user: UserVO = Field(description="用户信息")
