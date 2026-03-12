import { Modal } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import PreferenceSwitcher from '@/components/preferences/PreferenceSwitcher';
import wechatQR from '@/assets/images/wechat-links.jpg';
import { AUTH_CONFIG } from '@/constants/app.constants';
import { useAppPreferences } from '@/contexts/app-preferences';

import './main-layout.less';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useAppPreferences();

  const isLoggedIn = useMemo(() => {
    return !!localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
  }, [location.pathname]);

  const isAdmin = useMemo(() => {
    try {
      const info = localStorage.getItem('user_info');
      return info ? JSON.parse(info).isAdmin : false;
    } catch {
      return false;
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) {
      return;
    }

    /**
     * 同步导航栏实际高度，避免响应式换行后遮挡页面顶部按钮。
     */
    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${headerElement.offsetHeight}px`,
      );
    };

    syncHeaderHeight();
    const resizeObserver = new ResizeObserver(syncHeaderHeight);
    resizeObserver.observe(headerElement);
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_CONFIG.USER_TOKEN_KEY);
    localStorage.removeItem('user_info');
    navigate('/');
  };

  const showWechatContact = () => {
    Modal.info({
      title: '联系客服',
      icon: null,
      width: 360,
      centered: true,
      content: (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px' }}>
            扫码添加微信客服，随时为你服务
          </p>
          <div style={{
            display: 'inline-block',
            padding: 12,
            background: '#fff',
            border: '2px solid #e2e8f0',
            borderRadius: 16,
          }}>
            <img
              src={wechatQR}
              alt="微信客服"
              style={{ width: 200, height: 200, objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      ),
      okText: '已知晓',
    });
  };

  return (
    <div className="app-container">
      <header ref={headerRef} className={`app-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">O</span>
            <span className="logo-text">OneSub</span>
          </div>
          <nav className="nav-links">
            <a className={location.pathname === '/' ? 'active' : ''} onClick={() => navigate('/')}>
              {t('home')}
            </a>
            <a
              className={location.pathname === '/plans' ? 'active' : ''}
              onClick={() => navigate('/plans')}
            >
              {t('plans')}
            </a>
            {isLoggedIn && (
              <a
                className={location.pathname.startsWith('/orders') ? 'active' : ''}
                onClick={() => navigate('/orders')}
              >
                {t('orders')}
              </a>
            )}
            {isAdmin && (
              <a
                className={location.pathname === '/admin' ? 'active' : ''}
                onClick={() => navigate('/admin')}
              >
                {t('admin')}
              </a>
            )}
          </nav>
          <div className="header-actions">
            {isLoggedIn ? (
              <>
                <button className="btn-ghost" onClick={() => navigate('/profile')}>
                  {t('profile')}
                </button>
                <button className="btn-ghost" onClick={handleLogout}>
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate('/login')}>
                  {t('login')}
                </button>
                <button className="btn-primary" onClick={() => navigate('/login?tab=register')}>
                  {t('register')}
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
            <a onClick={() => navigate('/')}>{t('home')}</a>
            <a onClick={() => navigate('/plans')}>{t('plans')}</a>
            <a onClick={showWechatContact}>{t('support')}</a>
          </div>
          <div className="footer-copy">© 2026 OneSub. All rights reserved.</div>
        </div>
      </footer>

      <PreferenceSwitcher />
    </div>
  );
};

export default MainLayout;
