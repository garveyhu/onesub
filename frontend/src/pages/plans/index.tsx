import { CheckCircleOutlined, TagOutlined } from '@ant-design/icons';
import { App, Button, Input, Modal, Spin, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import alipayQR from '@/assets/images/alipay-links.jpg';
import wechatQR from '@/assets/images/wechat-links.jpg';
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

interface CouponInfo {
  code: string;
  discountAmount: number;
  remaining: number;
}

const PlansPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<number | null>(null);

  // 优惠码 & 支付弹窗
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

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

  const handleCheckCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    try {
      const res: any = await post('/coupon/check', { code: couponCode.trim() });
      if (res.success) {
        setCouponInfo(res.data);
        message.success(`优惠码有效！减免 ¥${res.data.discountAmount}`);
      } else {
        setCouponInfo(null);
        message.error(res.message || '优惠码无效');
      }
    } catch {
      setCouponInfo(null);
    } finally {
      setCouponChecking(false);
    }
  };

  const openPayModal = (plan: PlanItem) => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      message.info('请先登录');
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
    setCouponCode('');
    setCouponInfo(null);
    setPayModalOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedPlan) return;
    setOrdering(selectedPlan.id);
    try {
      const res: any = await post('/order/create', {
        planId: selectedPlan.id,
        couponCode: couponInfo ? couponInfo.code : undefined,
      });
      if (res.success) {
        message.success(`订单创建成功！订单号: ${res.data.orderNo}`);
        setPayModalOpen(false);
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

  const getActualPrice = () => {
    if (!selectedPlan) return 0;
    const discount = couponInfo ? couponInfo.discountAmount : 0;
    // Fix JS decimal precision (e.g. 29.9 - 20 = 9.899999999) and round to max 3 decimal places
    const amount = Math.max(selectedPlan.price - discount, 0);
    return Number(amount.toFixed(3));
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
            <div key={plan.id} className={`plan-card ${idx === 0 ? 'featured' : ''}`}>
              {idx === 0 && <div className="featured-tag">推荐</div>}
              <div className="plan-provider-tag">{plan.provider}</div>
              <h2>{plan.name}</h2>
              {plan.description && <p className="plan-desc">{plan.description}</p>}
              <div className="plan-pricing">
                <span className="currency">¥</span>
                <span className="amount">{plan.price}</span>
                <span className="duration">/{plan.durationDays}天</span>
              </div>

              <ul className="plan-feature-list">
                {(plan.features || []).map((f, i) => (
                  <li key={i}>
                    <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                type={idx === 0 ? 'primary' : 'default'}
                size="large"
                block
                onClick={() => openPayModal(plan)}
                className={idx === 0 ? 'order-btn featured' : 'order-btn'}
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

      {/* 支付弹窗 */}
      <Modal
        title="确认订单"
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        width={640}
        centered
        className="pay-modal"
      >
        {selectedPlan && (
          <div className="pay-modal-content">
            <div className="pay-plan-info">
              <h3>{selectedPlan.name}</h3>
              <span className="pay-provider">{selectedPlan.provider}</span>
            </div>

            {/* 优惠码 */}
            <div className="coupon-section">
              <label>
                <TagOutlined /> 优惠码
              </label>
              <div className="coupon-input-row">
                <Input
                  placeholder="输入优惠码（可选）"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onPressEnter={handleCheckCoupon}
                />
                <Button onClick={handleCheckCoupon} loading={couponChecking}>
                  验证
                </Button>
              </div>
              {couponInfo && (
                <Tag color="green" className="coupon-result">
                  ✓ 减免 ¥{couponInfo.discountAmount}
                </Tag>
              )}
            </div>

            {/* 价格明细 */}
            <div className="price-detail">
              <div className="price-row">
                <span>套餐原价</span>
                <span>¥{selectedPlan.price}</span>
              </div>
              {couponInfo && (
                <div className="price-row discount">
                  <span>优惠减免</span>
                  <span>-¥{couponInfo.discountAmount}</span>
                </div>
              )}
              <div className="price-row total">
                <span>实付金额</span>
                <span className="total-price">¥{getActualPrice()}</span>
              </div>
            </div>

            <div className="qr-container">
              {/* 支付宝收款码 */}
              <div className="qr-section">
                <div className="qr-step">第一步：支付宝扫码转账 <strong>¥{getActualPrice()}</strong></div>
                <div className="qr-wrapper">
                  <img src={alipayQR} alt="支付宝收款码" className="qr-image" />
                </div>
              </div>

              {/* 微信客服 */}
              <div className="qr-section">
                <div className="qr-step">第二步：添加客服并发送订单号</div>
                <div className="qr-wrapper">
                  <img src={wechatQR} alt="微信客服" className="qr-image" />
                </div>
                <p className="qr-note">转账后联系客服，5 分钟内开通</p>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={ordering === selectedPlan.id}
              onClick={handleSubmitOrder}
              className="pay-submit-btn"
            >
              我已支付，提交订单
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PlansPage;
