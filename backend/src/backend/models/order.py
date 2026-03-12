from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, text

from backend.complex.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(64), nullable=False, unique=True, index=True, comment="订单号")
    user_id = Column(Integer, index=True, nullable=False, comment="关联 users 表 ID")
    plan_id = Column(Integer, index=True, nullable=False, comment="关联 plans 表 ID")
    plan_name = Column(String(100), nullable=True, comment="套餐名称快照")
    amount = Column(Float, nullable=False, comment="原始金额")
    coupon_code = Column(String(50), nullable=True, comment="使用的优惠码")
    discount_amount = Column(Float, nullable=False, default=0, comment="优惠减免金额")
    actual_amount = Column(Float, nullable=False, comment="实付金额")
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="订单状态: pending/paid/processing/completed/cancelled",
    )
    payment_method = Column(String(20), nullable=True, default="alipay", comment="支付方式")
    paid_at = Column(DateTime(timezone=True), nullable=True, comment="支付时间")
    completed_at = Column(DateTime(timezone=True), nullable=True, comment="完成时间")
    expire_at = Column(DateTime(timezone=True), nullable=True, index=True, comment="支付截止时间")
    payment_proof = Column(Text, nullable=True, comment="支付凭证")
    progress_note = Column(Text, nullable=True, comment="开通进度")
    refund_status = Column(
        String(20),
        nullable=False,
        default="none",
        comment="退款状态: none/requested/refunded/rejected",
    )
    refund_reason = Column(Text, nullable=True, comment="退款原因")
    refund_amount = Column(Float, nullable=False, default=0, comment="退款金额")
    refunded_at = Column(DateTime(timezone=True), nullable=True, comment="退款时间")
    remark = Column(Text, nullable=True, comment="备注")
    admin_remark = Column(Text, nullable=True, comment="管理员备注")

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("(datetime('now', '+08:00'))"),
        onupdate=lambda: datetime.now(tz=timezone(timedelta(hours=8))),
    )
