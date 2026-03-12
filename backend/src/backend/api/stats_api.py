from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.complex.time_util import now_cst
from backend.models.invite_reward import InviteReward
from backend.models.order import Order
from backend.models.plan import Plan
from backend.models.ticket import Ticket
from backend.models.user import User

router = APIRouter(prefix="/stats", tags=["统计"])

CONFIRMED_ORDER_STATUSES = ["paid", "processing", "completed", "refunded"]


def _check_admin(user: User) -> None:
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取后台经营概览。"""
    _check_admin(current_user)
    today_start = now_cst().replace(hour=0, minute=0, second=0, microsecond=0)
    return Result.ok(
        {
            "total_users": db.query(func.count(User.id)).scalar() or 0,
            "today_users": db.query(func.count(User.id))
            .filter(User.created_at >= today_start)
            .scalar()
            or 0,
            "total_orders": db.query(func.count(Order.id)).scalar() or 0,
            "pending_orders": db.query(func.count(Order.id))
            .filter(Order.status == "pending")
            .scalar()
            or 0,
            "processing_orders": db.query(func.count(Order.id))
            .filter(Order.status == "processing")
            .scalar()
            or 0,
            "total_revenue": float(
                db.query(func.coalesce(func.sum(Order.actual_amount), 0))
                .filter(Order.status.in_(CONFIRMED_ORDER_STATUSES))
                .scalar()
                or 0
            ),
            "today_revenue": float(
                db.query(func.coalesce(func.sum(Order.actual_amount), 0))
                .filter(
                    Order.status.in_(CONFIRMED_ORDER_STATUSES),
                    Order.created_at >= today_start,
                )
                .scalar()
                or 0
            ),
            "active_subscriptions": db.query(func.count(User.id))
            .filter(User.subscription_expires_at >= today_start)
            .scalar()
            or 0,
            "open_tickets": db.query(func.count(Ticket.id))
            .filter(Ticket.status.in_(["open", "processing"]))
            .scalar()
            or 0,
            "total_plans": db.query(func.count(Plan.id)).scalar() or 0,
            "invite_rewards": db.query(func.count(InviteReward.id)).scalar() or 0,
        }
    )


@router.get("/retention")
def get_retention(
    days: int = Query(14, ge=7, le=60, description="统计天数"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """统计复购率与留存曲线。"""
    _check_admin(current_user)
    since = now_cst() - timedelta(days=days)
    orders = (
        db.query(Order)
        .filter(
            Order.status.in_(CONFIRMED_ORDER_STATUSES),
            Order.created_at >= since,
        )
        .order_by(Order.created_at.asc())
        .all()
    )

    user_orders: dict[int, list[Order]] = defaultdict(list)
    for item in orders:
        user_orders[item.user_id].append(item)

    repeat_customers = 0
    curve = []
    for offset in range(days):
        day = (since + timedelta(days=offset)).date()
        first_order_users = []
        retained_users = 0
        for user_id, user_items in user_orders.items():
            first_order = user_items[0]
            if first_order.created_at.date() != day:
                continue
            first_order_users.append(user_id)
            if len(user_items) > 1:
                retained_users += 1
        curve.append(
            {
                "date": day.isoformat(),
                "new_customers": len(first_order_users),
                "retained_customers": retained_users,
                "retention_rate": round(
                    (retained_users / len(first_order_users)) * 100, 2
                )
                if first_order_users
                else 0,
            }
        )

    for user_items in user_orders.values():
        if len(user_items) > 1:
            repeat_customers += 1

    active_customers = len(user_orders)
    repurchase_rate = (
        round((repeat_customers / active_customers) * 100, 2)
        if active_customers
        else 0
    )
    return Result.ok(
        {
            "repurchase_rate": repurchase_rate,
            "active_customers": active_customers,
            "repeat_customers": repeat_customers,
            "curve": curve,
        }
    )


@router.get("/plan-sales")
def get_plan_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """统计套餐销量与收入占比。"""
    _check_admin(current_user)
    rows = (
        db.query(
            Order.plan_name.label("plan_name"),
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.actual_amount), 0).label("revenue"),
        )
        .filter(Order.status.in_(CONFIRMED_ORDER_STATUSES))
        .group_by(Order.plan_name)
        .order_by(func.sum(Order.actual_amount).desc())
        .all()
    )
    total_revenue = sum(float(row.revenue) for row in rows)
    return Result.ok(
        [
            {
                "plan_name": row.plan_name or "未知套餐",
                "count": row.count,
                "revenue": float(row.revenue),
                "revenue_share": round(float(row.revenue) / total_revenue * 100, 2)
                if total_revenue
                else 0,
            }
            for row in rows
        ]
    )


@router.get("/coupon-performance")
def get_coupon_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """统计优惠码使用次数与带来的收入。"""
    _check_admin(current_user)
    rows = (
        db.query(
            Order.coupon_code.label("coupon_code"),
            func.count(Order.id).label("used_count"),
            func.coalesce(func.sum(Order.actual_amount), 0).label("revenue"),
        )
        .filter(
            Order.coupon_code.isnot(None),
            Order.status.in_(CONFIRMED_ORDER_STATUSES),
        )
        .group_by(Order.coupon_code)
        .order_by(func.count(Order.id).desc())
        .all()
    )
    return Result.ok(
        [
            {
                "coupon_code": row.coupon_code,
                "used_count": row.used_count,
                "revenue": float(row.revenue),
            }
            for row in rows
        ]
    )
