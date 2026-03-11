import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.models.coupon import Coupon
from backend.models.order import Order
from backend.models.plan import Plan
from backend.modules.order.schemas.order_dto import OrderCreateDTO


class OrderService:
    @staticmethod
    def _generate_order_no() -> str:
        """生成订单号：OS + 时间戳 + 随机"""
        now = datetime.now(tz=timezone(timedelta(hours=8)))
        return f"OS{now.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def create(db: Session, user_id: int, dto: OrderCreateDTO) -> Order:
        """创建订单（支持优惠码）"""
        plan = (
            db.query(Plan).filter(Plan.id == dto.plan_id, Plan.is_active == True).first()
        )
        if not plan:
            raise CustomException(ResultCode.NOT_FOUND, "套餐不存在或已下架")

        discount = 0.0
        coupon_code = None

        # 验证优惠码
        if dto.coupon_code:
            coupon = (
                db.query(Coupon)
                .filter(Coupon.code == dto.coupon_code, Coupon.is_active == True)
                .first()
            )
            if not coupon:
                raise CustomException(ResultCode.FAIL, "优惠码无效")
            if coupon.used_count >= coupon.max_uses:
                raise CustomException(ResultCode.FAIL, "优惠码已用完")
            discount = coupon.discount_amount
            coupon_code = coupon.code
            # 增加使用次数
            coupon.used_count += 1

        actual_amount = max(plan.price - discount, 0)

        order = Order(
            order_no=OrderService._generate_order_no(),
            user_id=user_id,
            plan_id=plan.id,
            plan_name=plan.name,
            amount=plan.price,
            coupon_code=coupon_code,
            discount_amount=discount,
            actual_amount=actual_amount,
            status="pending",
            payment_method="alipay",
            remark=dto.remark,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def list_by_user(db: Session, user_id: int) -> list[Order]:
        """获取用户订单列表"""
        return (
            db.query(Order)
            .filter(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise CustomException(ResultCode.NOT_FOUND, f"订单 {order_id} 不存在")
        return order

    @staticmethod
    def cancel(db: Session, order_id: int, user_id: int) -> Order:
        """取消订单（仅 pending 状态可取消，退还优惠码使用次数）"""
        order = OrderService.get_by_id(db, order_id)
        if order.user_id != user_id:
            raise CustomException(ResultCode.FORBIDDEN, "无权操作此订单")
        if order.status != "pending":
            raise CustomException(ResultCode.FAIL, "只有待支付订单可以取消")

        order.status = "cancelled"

        # 退还优惠码使用次数
        if order.coupon_code:
            coupon = (
                db.query(Coupon).filter(Coupon.code == order.coupon_code).first()
            )
            if coupon and coupon.used_count > 0:
                coupon.used_count -= 1

        db.commit()
        db.refresh(order)
        return order

    # ---- 管理员操作 ----

    @staticmethod
    def list_all(db: Session) -> list[Order]:
        """获取所有订单（管理员）"""
        return db.query(Order).order_by(Order.created_at.desc()).all()

    @staticmethod
    def confirm_paid(db: Session, order_id: int, admin_remark: str = None) -> Order:
        """管理员确认收款"""
        order = OrderService.get_by_id(db, order_id)
        if order.status != "pending":
            raise CustomException(ResultCode.FAIL, "只有待支付订单可以确认收款")

        order.status = "paid"
        order.paid_at = datetime.now(tz=timezone(timedelta(hours=8)))
        if admin_remark:
            order.admin_remark = admin_remark
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update_status(db: Session, order_id: int, status: str, admin_remark: str = None) -> Order:
        """管理员更新订单状态"""
        order = OrderService.get_by_id(db, order_id)
        order.status = status
        if status == "completed":
            order.completed_at = datetime.now(tz=timezone(timedelta(hours=8)))
        if admin_remark:
            order.admin_remark = admin_remark
        db.commit()
        db.refresh(order)
        return order
