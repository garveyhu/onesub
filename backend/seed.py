"""种子数据脚本 — 创建初始套餐和优惠码"""
import json
import sys
from pathlib import Path

# 添加 src 到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from backend.complex.database import SessionLocal
from backend.models.coupon import Coupon
from backend.models.plan import Plan


def seed():
    db = SessionLocal()
    try:
        # Claude Code 订阅套餐
        existing_plan = db.query(Plan).filter(Plan.name == "Claude Pro").first()
        if not existing_plan:
            plan = Plan(
                name="Claude Pro",
                description="Claude 3.5 Sonnet 专业版订阅，解锁全部高级功能",
                provider="Anthropic",
                duration_days=30,
                price=180,
                original_price=200,
                features=json.dumps(
                    [
                        "Claude 3.5 Sonnet 无限使用",
                        "优先响应速度",
                        "200K 超长上下文",
                        "文件上传与分析",
                        "Claude Code 编程助手",
                    ],
                    ensure_ascii=False,
                ),
                is_active=True,
                sort_order=1,
            )
            db.add(plan)
            print("✅ 已创建套餐: Claude Pro ¥180/月")
        else:
            print("⏭️  套餐 Claude Pro 已存在，跳过")

        # ¥20 优惠码
        existing_coupon = db.query(Coupon).filter(Coupon.code == "WELCOME20").first()
        if not existing_coupon:
            coupon = Coupon(
                code="WELCOME20",
                discount_amount=20,
                max_uses=5,
                used_count=0,
                is_active=True,
            )
            db.add(coupon)
            print("✅ 已创建优惠码: WELCOME20 (减¥20, 可用5次)")
        else:
            print("⏭️  优惠码 WELCOME20 已存在，跳过")

        db.commit()
        print("\n🎉 种子数据初始化完成!")
    except Exception as e:
        db.rollback()
        print(f"❌ 初始化失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
