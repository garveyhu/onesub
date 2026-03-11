"""种子数据脚本 — 创建初始套餐和优惠码"""
import json
import sys
from pathlib import Path

# 添加 src 到路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from backend.complex.database import SessionLocal
from backend.models.coupon import Coupon
from backend.models.plan import Plan
from backend.models.user import User
from backend.modules.user.service.user_service import _hash_password


PLANS = [
    {
        "name": "Claude Pro",
        "description": "Anthropic Claude Opus 4.6 专业版，最强编程与推理 AI",
        "provider": "Anthropic",
        "duration_days": 30,
        "price": 180,
        "features": [
            "Claude Opus 4.6 解锁使用",
            "200K 超长上下文窗口",
            "128K 输出 Token",
            "Claude Code 编程助手",
            "文件上传与分析",
            "自适应深度思考",
        ],
        "sort_order": 1,
        "is_hot": True,
    },
    {
        "name": "ChatGPT Plus",
        "description": "OpenAI GPT-5.4 全能版，文本/图片/语音/视频多模态 AI",
        "provider": "OpenAI",
        "duration_days": 30,
        "price": 180,
        "features": [
            "GPT-5.4 解锁使用",
            "128K 上下文窗口",
            "GPT Image 1 图片生成",
            "高级数据分析与代码解释器",
            "深度研究模式",
            "自定义 GPTs",
        ],
        "sort_order": 2,
        "is_hot": True,
    },
    {
        "name": "Gemini Pro",
        "description": "Google Gemini 3.1 Pro，百万级上下文与深度研究能力",
        "provider": "Google",
        "duration_days": 30,
        "price": 180,
        "features": [
            "Gemini 3.1 Pro 解锁使用",
            "100 万 Token 超长上下文",
            "深度研究与自动报告生成",
            "Google Workspace 深度集成",
            "自定义 AI 助手 (Gems)",
            "2TB Google Drive 存储",
        ],
        "sort_order": 3,
        "is_hot": True,
    },
    {
        "name": "Claude Max",
        "description": "Anthropic 顶级套餐，5 倍用量上限，Agent 团队协作",
        "provider": "Anthropic",
        "duration_days": 30,
        "price": 800,
        "features": [
            "Claude Opus 4.6 全系列模型",
            "5 倍用量上限",
            "Agent 团队多智能体协作",
            "100 万 Token 上下文 (Beta)",
            "优先队列响应",
            "专属客服支持",
        ],
        "sort_order": 4,
    },
]


def seed():
    db = SessionLocal()
    try:
        for plan_data in PLANS:
            existing = db.query(Plan).filter(Plan.name == plan_data["name"]).first()
            if not existing:
                plan = Plan(
                    name=plan_data["name"],
                    description=plan_data["description"],
                    provider=plan_data["provider"],
                    duration_days=plan_data["duration_days"],
                    price=plan_data["price"],
                    features=json.dumps(plan_data["features"], ensure_ascii=False),
                    is_active=True,
                    is_hot=plan_data.get("is_hot", False),
                    sort_order=plan_data["sort_order"],
                )
                db.add(plan)
                print(f"✅ 已创建套餐: {plan_data['name']} ¥{plan_data['price']}/月")
            else:
                # 更新现有套餐信息
                existing.description = plan_data["description"]
                existing.price = plan_data["price"]
                existing.features = json.dumps(plan_data["features"], ensure_ascii=False)
                existing.sort_order = plan_data["sort_order"]
                existing.is_hot = plan_data.get("is_hot", False)
                print(f"🔄 已更新套餐: {plan_data['name']}")

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

        # 默认管理员用户
        admin_user = db.query(User).filter(User.username == "links").first()
        if not admin_user:
            user = User(
                username="links",
                password_hash=_hash_password("030317Archer"),
                is_admin=True,
            )
            db.add(user)
            print("✅ 已创建默认管理员: links / 030317Archer")
        else:
            admin_user.is_admin = True
            admin_user.password_hash = _hash_password("030317Archer")
            print("🔄 已将用户 links 设为管理员并重置密码")

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
