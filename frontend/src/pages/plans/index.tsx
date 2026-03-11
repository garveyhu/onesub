import { App, Button, Spin } from 'antd';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { get, post } from '@/services';

import './index.less';

interface PlanItem {
  id: number;
  name: string;
  description: string;
  provider: string;
  durationDays: number;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
}

const PlansPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<number | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res: any = await get('/plan');
      if (res.success) {
        setPlans(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (plan: PlanItem) => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      message.info('请先登录');
      navigate('/login');
      return;
    }

    setOrdering(plan.id);
    try {
      const res: any = await post('/order/create', { planId: plan.id });
      if (res.success) {
        message.success(`订单创建成功！订单号: ${res.data.orderNo}`);
        navigate('/orders');
      } else {
        message.error(res.message || '下单失败');
      }
    } catch {
      message.error('下单失败，请稍后再试');
    } finally {
      setOrdering(null);
    }
  };

  if (loading) {
    return (
      <div className="plans-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="plans-page">
      <div className="plans-header">
        <h1>选择套餐</h1>
        <p>选择最适合你的 AI 订阅方案，极速开通</p>
      </div>

      <div className="plans-grid">
        {plans.length > 0 ? (
          plans.map((plan, idx) => (
            <div key={plan.id} className={`plan-card ${idx === 1 ? 'featured' : ''}`}>
              {idx === 1 && <div className="featured-tag">最受欢迎</div>}
              <div className="plan-provider-tag">{plan.provider}</div>
              <h2>{plan.name}</h2>
              {plan.description && <p className="plan-desc">{plan.description}</p>}
              <div className="plan-pricing">
                <span className="currency">¥</span>
                <span className="amount">{plan.price}</span>
                <span className="duration">/{plan.durationDays}天</span>
              </div>
              {plan.originalPrice > 0 && (
                <div className="original-price">官方价 ¥{plan.originalPrice}</div>
              )}
              <ul className="plan-feature-list">
                {(plan.features || []).map((f, i) => (
                  <li key={i}>✓ {f}</li>
                ))}
              </ul>
              <Button
                type={idx === 1 ? 'primary' : 'default'}
                size="large"
                block
                loading={ordering === plan.id}
                onClick={() => handleOrder(plan)}
                className={idx === 1 ? 'order-btn featured' : 'order-btn'}
              >
                立即订阅
              </Button>
            </div>
          ))
        ) : (
          <div className="plans-empty">
            <p>暂无可用套餐，请稍后再来</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansPage;
