import { RocketOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import './index.less';

const plans = [
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    provider: 'Anthropic',
    price: 180,
    duration: '月',
    features: ['Claude Opus 4.6 解锁使用', '200K 超长上下文', 'Claude Code 编程助手', '自适应深度思考'],
    color: '#f59e0b',
    popular: true,
  },
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    provider: 'OpenAI',
    price: 180,
    duration: '月',
    features: ['GPT-5.4 解锁使用', 'GPT Image 1 图片生成', '高级数据分析', '深度研究模式'],
    color: '#10b981',
    popular: false,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    price: 180,
    duration: '月',
    features: ['Gemini 3.1 Pro 解锁使用', '百万级上下文窗口', '深度研究报告', 'Google 全家桶集成'],
    color: '#3b82f6',
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
          <div className="hero-badge">🚀 全网低价 AI 订阅代充</div>
          <h1>
            一键订阅<span className="gradient-text">全球顶级 AI</span>
          </h1>
          <p className="hero-desc">
            无需海外信用卡，无需复杂操作。OneSub 为你提供 Claude Opus 4.6、GPT-5.4、Gemini 3.1 Pro
            等热门 AI 工具的便捷代充订阅服务，支付宝扫码即充，极速开通。
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
              <div className="feature-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#0ea5e9' }}>
                <ThunderboltOutlined />
              </div>
              <h3>极速开通</h3>
              <p>支付宝扫码付款，客服确认后 5 分钟内完成开通，即刻使用</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <SafetyOutlined />
              </div>
              <h3>安全可靠</h3>
              <p>支付宝安全支付，正规渠道订阅，账号安全有保障</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <RocketOutlined />
              </div>
              <h3>价格优惠</h3>
              <p>批量采购成本优势，支持优惠码，首单立减</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section">
        <div className="section-inner">
          <h2 className="section-title">热门套餐</h2>
          <p className="section-subtitle">主流 AI 工具全覆盖，选择适合你的方案</p>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">推荐</div>}
                <div className="plan-provider">{plan.provider}</div>
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-currency">¥</span>
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-duration">/{plan.duration}</span>
                </div>
                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <span className="check">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`plan-btn ${plan.popular ? 'primary' : ''}`}
                  onClick={() => navigate('/plans')}
                >
                  立即订阅
                </button>
              </div>
            ))}
          </div>
          <div className="more-plans">
            还有 <strong>Claude Max ¥800/月</strong> 等更多套餐方案 →{' '}
            <a onClick={() => navigate('/plans')}>查看全部</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>准备好开始了吗？</h2>
          <p>注册即享首单优惠码 WELCOME20，立减 ¥20</p>
          <button className="btn-hero-primary" onClick={() => navigate('/login?tab=register')}>
            免费注册，立即体验
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
