import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';

import './main-layout.less';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const isLoggedIn = useMemo(() => {
    return !!localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_CONFIG.USER_TOKEN_KEY);
    navigate('/');
  };

  return (
    <div className="app-container">
      <header className={`app-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">O</span>
            <span className="logo-text">OneSub</span>
          </div>
          <nav className="nav-links">
            <a onClick={() => navigate('/')}>首页</a>
            <a onClick={() => navigate('/plans')}>套餐</a>
            {isLoggedIn && <a onClick={() => navigate('/orders')}>我的订单</a>}
          </nav>
          <div className="header-actions">
            {isLoggedIn ? (
              <>
                <button className="btn-ghost" onClick={() => navigate('/profile')}>
                  个人中心
                </button>
                <button className="btn-ghost" onClick={handleLogout}>
                  退出
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate('/login')}>
                  登录
                </button>
                <button className="btn-primary" onClick={() => navigate('/login?tab=register')}>
                  注册
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="logo-icon small">O</span>
            <span>OneSub</span>
          </div>
          <div className="footer-links">
            <a onClick={() => navigate('/')}>首页</a>
            <a onClick={() => navigate('/plans')}>套餐</a>
            <a href="mailto:support@onesub.com">联系我们</a>
          </div>
          <div className="footer-copy">© 2026 OneSub. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
