import { RocketOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';

import { useNavigate } from 'react-router-dom';

import './index.less';

const plans = [
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    provider: 'Anthropic',
    price: 149,
    originalPrice: 200,
    duration: '月',
    features: ['Claude 3.5 Sonnet 无限使用', '优先响应速度', '200K 超长上下文', '文件上传与分析'],
    color: '#f59e0b',
    popular: false,
  },
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    provider: 'OpenAI',
    price: 149,
    originalPrice: 200,
    duration: '月',
    features: ['GPT-4o 无限使用', 'DALL·E 3 图片生成', '高级数据分析', '自定义 GPTs'],
    color: '#10b981',
    popular: true,
  },
  {
    id: 'claude-team',
    name: 'Claude Max',
    provider: 'Anthropic',
    price: 699,
    originalPrice: 1400,
    duration: '月',
    features: ['Claude 3.5 全系列模型', '5 倍用量上限', '优先队列', '专属客服支持'],
    color: '#8b5cf6',
    popular: false,
  },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">🚀 全网最低价 AI 订阅</div>
          <h1>
            一键订阅<span className="gradient-text">全球顶级 AI</span>服务
          </h1>
          <p className="hero-desc">
            无需海外信用卡，无需复杂操作。OneSub 为你提供 Claude、ChatGPT 等热门 AI
            工具的便捷代充订阅服务，极速开通，安全可靠。
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate('/plans')}>
              查看套餐
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('/login?tab=register')}>
              免费注册
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">10,000+</span>
              <span className="stat-label">用户信赖</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">5 分钟</span>
              <span className="stat-label">极速开通</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">24/7</span>
              <span className="stat-label">在线支持</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-inner">
          <h2 className="section-title">为什么选择 OneSub</h2>
          <p className="section-subtitle">简单三步，即刻拥有顶级 AI 能力</p>
          <div className="features-grid">
            <div className="feature-card">
              <div
                className="feature-icon"
                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}
              >
                <ThunderboltOutlined />
              </div>
              <h3>极速开通</h3>
              <p>下单后 5 分钟内完成开通，即刻享用 AI 服务，无需等待</p>
            </div>
            <div className="feature-card">
              <div
                className="feature-icon"
                style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
              >
                <SafetyOutlined />
              </div>
              <h3>安全可靠</h3>
              <p>支付宝安全支付，正规渠道订阅，账号安全有保障</p>
            </div>
            <div className="feature-card">
              <div
                className="feature-icon"
                style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}
              >
                <RocketOutlined />
              </div>
              <h3>价格优惠</h3>
              <p>批量采购成本优势，价格远低于官方直购，性价比超高</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section">
        <div className="section-inner">
          <h2 className="section-title">热门套餐</h2>
          <p className="section-subtitle">选择适合你的 AI 订阅方案</p>
          <div className="pricing-grid">
            {plans.map(plan => (
              <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">最受欢迎</div>}
                <div className="plan-provider">{plan.provider}</div>
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-currency">¥</span>
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-duration">/{plan.duration}</span>
                </div>
                {plan.originalPrice && (
                  <div className="plan-original">
                    官方价 ¥{plan.originalPrice}/{plan.duration}
                  </div>
                )}
                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <span className="check">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`plan-btn ${plan.popular ? 'primary' : ''}`}
                  onClick={() => navigate('/login?tab=register')}
                >
                  立即订阅
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>准备好开始了吗？</h2>
          <p>注册即享首单优惠，30 秒完成注册</p>
          <button className="btn-hero-primary" onClick={() => navigate('/login?tab=register')}>
            免费注册，立即体验
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
