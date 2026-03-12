import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PreferenceSwitcher from '@/components/preferences/PreferenceSwitcher';
import { AUTH_CONFIG } from '@/constants/app.constants';
import { useAppPreferences } from '@/contexts/app-preferences';
import { get, post } from '@/services';

import './index.less';

interface CaptchaData {
  captchaId: string;
  imageData: string;
}

interface RegisterFormValues {
  username: string;
  email?: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
  captchaCode?: string;
}

interface LoginFormValues {
  username: string;
  password: string;
  captchaCode?: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [registerInviteCode, setRegisterInviteCode] = useState('');
  const { message } = App.useApp();
  const { t } = useAppPreferences();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const inviteCode = searchParams.get('invite') || '';
    if (tab === 'register') {
      setActiveTab('register');
    }
    if (inviteCode) {
      setRegisterInviteCode(inviteCode.toUpperCase());
    }
    refreshCaptcha();
  }, [searchParams]);

  /**
   * 拉取新的验证码，避免旧验证码被服务端消费后无法继续提交。
   */
  const refreshCaptcha = async () => {
    try {
      const res: any = await get('/security/captcha');
      if (res.success) {
        setCaptcha(res.data);
      }
    } catch {
      setCaptcha(null);
    }
  };

  /**
   * 统一保存登录态，避免多个页面读写键名不一致。
   */
  const saveAuthInfo = (token: string, user: unknown) => {
    localStorage.setItem(AUTH_CONFIG.USER_TOKEN_KEY, token);
    localStorage.setItem(AUTH_CONFIG.USER_INFO_KEY, JSON.stringify(user));
  };

  const onLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res: any = await post('/auth/login', {
        ...values,
        captchaId: captcha?.captchaId,
      });
      if (res.success) {
        saveAuthInfo(res.data.token, res.data.user);
        message.success('登录成功');
        navigate('/');
      }
    } catch {
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const res: any = await post('/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        inviteCode: values.inviteCode,
        captchaCode: values.captchaCode,
        captchaId: captcha?.captchaId,
      });
      if (res.success) {
        saveAuthInfo(res.data.token, res.data.user);
        message.success('注册成功');
        navigate('/');
      }
    } catch {
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" onClick={() => navigate('/')}>
            <span className="logo-icon">O</span>
            <span className="logo-text">OneSub</span>
          </div>
          <p className="login-subtitle">{t('loginSubtitle')}</p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: t('login'),
              children: (
                <Form layout="vertical" onFinish={onLogin} size="large" autoComplete="off">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item
                    name="captchaCode"
                    rules={[{ required: true, message: '请输入验证码' }]}
                  >
                    <Input
                      suffix={
                        captcha ? (
                          <img
                            alt="captcha"
                            src={captcha.imageData}
                            style={{ width: 96, cursor: 'pointer' }}
                            onClick={refreshCaptcha}
                          />
                        ) : undefined
                      }
                      placeholder="验证码"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} className="submit-btn">
                      {t('login')}
                    </Button>
                  </Form.Item>
                  <div className="switch-hint">
                    还没有账号？
                    <a onClick={() => setActiveTab('register')}>立即注册</a>
                  </div>
                </Form>
              ),
            },
            {
              key: 'register',
              label: t('register'),
              children: (
                <Form
                  layout="vertical"
                  onFinish={onRegister}
                  size="large"
                  autoComplete="off"
                  initialValues={{ inviteCode: registerInviteCode }}
                >
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="email">
                    <Input prefix={<MailOutlined />} placeholder="邮箱（选填）" />
                  </Form.Item>
                  <Form.Item name="inviteCode">
                    <Input placeholder="邀请码（选填）" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少 6 位' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    rules={[
                      { required: true, message: '请确认密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  <Form.Item
                    name="captchaCode"
                    rules={[{ required: true, message: '请输入验证码' }]}
                  >
                    <Input
                      suffix={
                        captcha ? (
                          <img
                            alt="captcha"
                            src={captcha.imageData}
                            style={{ width: 96, cursor: 'pointer' }}
                            onClick={refreshCaptcha}
                          />
                        ) : undefined
                      }
                      placeholder="验证码"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading} className="submit-btn">
                      {t('register')}
                    </Button>
                  </Form.Item>
                  <div className="switch-hint">
                    已有账号？
                    <a onClick={() => setActiveTab('login')}>去登录</a>
                  </div>
                </Form>
              ),
            },
          ]}
        />
      </div>
      <PreferenceSwitcher />
    </div>
  );
};

export default LoginPage;
