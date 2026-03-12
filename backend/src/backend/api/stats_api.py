from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from backend.complex.auth.oauth import get_current_user
from backend.complex.database import get_db
from backend.complex.response.code import ResultCode
from backend.complex.response.exception import CustomException
from backend.complex.response.result import Result
from backend.models.order import Order
from backend.models.plan import Plan
from backend.models.coupon import Coupon
from backend.models.user import User

router = APIRouter(prefix="/stats", tags=["统计"])

CST = timezone(timedelta(hours=8))


def _check_admin(user: User):
    if not user.is_admin:
        raise CustomException(ResultCode.FORBIDDEN, "仅管理员可操作")


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：数据概览"""
    _check_admin(current_user)

    today_start = datetime.now(CST).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # 用户统计
    total_users = db.query(func.count(User.id)).scalar() or 0
    today_users = (
        db.query(func.count(User.id))
        .filter(User.created_at >= today_start)
        .scalar()
        or 0
    )

    # 订单统计
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    pending_orders = (
        db.query(func.count(Order.id))
        .filter(Order.status == "pending")
        .scalar()
        or 0
    )

    # 收入统计（已确认付款 + 已完成的订单）
    total_revenue = (
        db.query(func.coalesce(func.sum(Order.actual_amount), 0))
        .filter(Order.status.in_(["paid", "processing", "completed"]))
        .scalar()
        or 0
    )
    today_revenue = (
        db.query(func.coalesce(func.sum(Order.actual_amount), 0))
        .filter(
            Order.status.in_(["paid", "processing", "completed"]),
            Order.created_at >= today_start,
        )
        .scalar()
        or 0
    )

    # 套餐和优惠码数量
    total_plans = db.query(func.count(Plan.id)).scalar() or 0
    total_coupons = db.query(func.count(Coupon.id)).scalar() or 0

    return Result.ok(
        {
            "total_users": total_users,
            "today_users": today_users,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_revenue": float(total_revenue),
            "today_revenue": float(today_revenue),
            "total_plans": total_plans,
            "total_coupons": total_coupons,
        }
    )


@router.get("/trend")
def get_trend(
    days: int = Query(7, ge=1, le=90, description="近 N 天"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员：近 N 天每日订单数和收入"""
    _check_admin(current_user)

    today = datetime.now(CST).date()
    start_date = today - timedelta(days=days - 1)

    # 查询每日订单数
    order_rows = (
        db.query(
            func.date(Order.created_at).label("day"),
            func.count(Order.id).label("count"),
        )
        .filter(func.date(Order.created_at) >= start_date.isoformat())
        .group_by(func.date(Order.created_at))
        .all()
    )
    order_map = {str(r.day): r.count for r in order_rows}

    # 查询每日收入
    revenue_rows = (
        db.query(
            func.date(Order.created_at).label("day"),
            func.coalesce(func.sum(Order.actual_amount), 0).label("revenue"),
        )
        .filter(
            func.date(Order.created_at) >= start_date.isoformat(),
            Order.status.in_(["paid", "processing", "completed"]),
        )
        .group_by(func.date(Order.created_at))
        .all()
    )
    revenue_map = {str(r.day): float(r.revenue) for r in revenue_rows}

    # 填充日期
    result = []
    for i in range(days):
        d = (start_date + timedelta(days=i)).isoformat()
        result.append({
            "date": d,
            "orders": order_map.get(d, 0),
            "revenue": revenue_map.get(d, 0),
        })

    return Result.ok(result)
