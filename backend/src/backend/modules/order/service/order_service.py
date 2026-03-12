import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.site_setting_util import get_int_setting
from backend.complex.time_util import ensure_cst, now_cst
from backend.models.coupon import Coupon
from backend.models.order import Order
from backend.models.plan import Plan
from backend.models.user import User
from backend.modules.invite.service.invite_service import InviteService
from backend.modules.order.schemas.order_dto import OrderCreateDTO


class OrderService:
    @staticmethod
    def _generate_order_no() -> str:
        """生成订单号：OS + 时间戳 + 随机"""
        now = datetime.now(tz=timezone(timedelta(hours=8)))
        return f"OS{now.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def _rollback_coupon_usage(db: Session, coupon_code: str | None) -> None:
        """订单取消或超时后回退优惠码次数。"""
        if not coupon_code:
            return
        coupon = db.query(Coupon).filter(Coupon.code == coupon_code).first()
        if coupon and coupon.used_count > 0:
            coupon.used_count -= 1

    @staticmethod
    def _activate_subscription(db: Session, order: Order) -> None:
        """在订单完成时延长用户订阅。"""
        user = db.query(User).filter(User.id == order.user_id).first()
        plan = db.query(Plan).filter(Plan.id == order.plan_id).first()
        if not user or not plan:
            return

        now = now_cst()
        base_time = ensure_cst(user.subscription_expires_at) or now
        if base_time < now:
            base_time = now
        user.subscription_expires_at = base_time + timedelta(days=plan.duration_days)

    @staticmethod
    def cancel_expired_orders(db: Session) -> int:
        """批量取消超时未支付订单。"""
        now = now_cst()
        expired_orders = (
            db.query(Order)
            .filter(
                Order.status == "pending",
                Order.expire_at.isnot(None),
                Order.expire_at <= now,
            )
            .all()
        )
        for order in expired_orders:
            order.status = "cancelled"
            order.admin_remark = "系统自动取消超时订单"
            OrderService._rollback_coupon_usage(db, order.coupon_code)
        if expired_orders:
            db.commit()
        return len(expired_orders)

    @staticmethod
    def create(db: Session, user_id: int, dto: OrderCreateDTO) -> Order:
        """创建订单（支持优惠码）"""
        OrderService.cancel_expired_orders(db)
        plan = (
            db.query(Plan).filter(Plan.id == dto.plan_id, Plan.is_active).first()
        )
        if not plan:
            raise CustomException(ResultCode.NOT_FOUND, "套餐不存在或已下架")

        # 检查未完成订单数量
        pending_orders_count = (
            db.query(Order)
            .filter(
                Order.user_id == user_id,
                Order.status == "pending"
            )
            .count()
        )
        if pending_orders_count >= 3:
            raise CustomException(ResultCode.FAIL, "您有太多未完成的订单，请先支付或取消")

        discount = 0.0
        coupon_code = None

        # 验证优惠码
        if dto.coupon_code:
            coupon = (
                db.query(Coupon)
                .filter(Coupon.code == dto.coupon_code, Coupon.is_active)
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
            payment_method=dto.payment_method,
            expire_at=now_cst() + timedelta(hours=get_int_setting(db, "order_timeout_hours", 2)),
            progress_note="等待支付确认",
            remark=dto.remark,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def list_by_user(db: Session, user_id: int) -> list[Order]:
        """获取用户订单列表"""
        OrderService.cancel_expired_orders(db)
        return (
            db.query(Order)
            .filter(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Order:
        """按 ID 获取订单。"""
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise CustomException(ResultCode.NOT_FOUND, f"订单 {order_id} 不存在")
        return order

    @staticmethod
    def get_detail(db: Session, order_id: int, current_user: User) -> Order:
        """获取订单详情并校验访问权限。"""
        OrderService.cancel_expired_orders(db)
        order = OrderService.get_by_id(db, order_id)
        if not current_user.is_admin and order.user_id != current_user.id:
            raise CustomException(ResultCode.FORBIDDEN, "无权查看此订单")
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
        OrderService._rollback_coupon_usage(db, order.coupon_code)

        db.commit()
        db.refresh(order)
        return order

    # ---- 管理员操作 ----

    @staticmethod
    def list_all(
        db: Session,
        username_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        order_no_filter: Optional[str] = None,
    ) -> list[dict]:
        """获取所有订单（管理员），支持按用户名、订单号和状态筛选，返回带 username 的字典列表"""
        OrderService.cancel_expired_orders(db)
        query = db.query(Order, User.username).join(User, Order.user_id == User.id)

        if username_filter:
            query = query.filter(User.username.contains(username_filter))
        if order_no_filter:
            query = query.filter(Order.order_no.contains(order_no_filter))
        if status_filter:
            query = query.filter(Order.status == status_filter)

        results = query.order_by(Order.created_at.desc()).all()

        output = []
        for order, username in results:
            order.username = username  # type: ignore
            output.append(order)
        return output

    @staticmethod
    def confirm_paid(db: Session, order_id: int, admin_remark: str = None) -> Order:
        """管理员确认收款"""
        order = OrderService.get_by_id(db, order_id)
        if order.status != "pending":
            raise CustomException(ResultCode.FAIL, "只有待支付订单可以确认收款")

        order.status = "paid"
        order.paid_at = datetime.now(tz=timezone(timedelta(hours=8)))
        order.progress_note = "支付已确认，等待开通"
        if admin_remark:
            order.admin_remark = admin_remark
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update_status(
        db: Session,
        order_id: int,
        status: str,
        admin_remark: str = None,
        progress_note: str = None,
    ) -> Order:
        """管理员更新订单状态"""
        order = OrderService.get_by_id(db, order_id)
        order.status = status
        if status == "processing" and not progress_note:
            order.progress_note = "账号开通处理中"
        if status == "completed":
            if not order.completed_at:
                order.completed_at = datetime.now(tz=timezone(timedelta(hours=8)))
                OrderService._activate_subscription(db, order)
                InviteService.settle_reward(db, order)
            order.progress_note = progress_note or "服务已开通完成"
        elif progress_note:
            order.progress_note = progress_note
        if admin_remark:
            order.admin_remark = admin_remark
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def submit_payment_proof(
        db: Session,
        order_id: int,
        user_id: int,
        payment_proof: str,
    ) -> Order:
        """用户提交支付凭证。"""
        order = OrderService.get_by_id(db, order_id)
        if order.user_id != user_id:
            raise CustomException(ResultCode.FORBIDDEN, "无权操作此订单")
        if order.status != "pending":
            raise CustomException(ResultCode.FAIL, "当前订单无需提交支付凭证")
        order.payment_proof = payment_proof.strip()
        order.progress_note = "已提交支付凭证，等待人工/回调确认"
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def refund(
        db: Session,
        order_id: int,
        refund_reason: str,
        refund_amount: float | None = None,
        admin_remark: str | None = None,
    ) -> Order:
        """管理员处理退款。"""
        order = OrderService.get_by_id(db, order_id)
        if order.status not in {"paid", "processing", "completed"}:
            raise CustomException(ResultCode.FAIL, "当前订单状态不允许退款")

        order.status = "refunded"
        order.refund_status = "refunded"
        order.refund_reason = refund_reason.strip()
        order.refund_amount = refund_amount if refund_amount is not None else order.actual_amount
        order.refunded_at = now_cst()
        order.progress_note = "订单已退款"
        if admin_remark:
            order.admin_remark = admin_remark
        db.commit()
        db.refresh(order)
        return order
