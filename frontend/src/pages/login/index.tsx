import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Tabs } from 'antd';

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { post } from '@/services';

import './index.less';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setActiveTab('register');
    }
  }, [searchParams]);

  const onLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await post('/auth/login', values);
      if (res.success) {
        localStorage.setItem(AUTH_CONFIG.USER_TOKEN_KEY, res.data.token);
        localStorage.setItem('user_info', JSON.stringify(res.data.user));
        message.success('登录成功！');
        navigate('/');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch {
      message.error('登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: { username: string; password: string; email?: string }) => {
    setLoading(true);
    try {
      const res: any = await post('/auth/register', values);
      if (res.success) {
        localStorage.setItem(AUTH_CONFIG.USER_TOKEN_KEY, res.data.token);
        localStorage.setItem('user_info', JSON.stringify(res.data.user));
        message.success('注册成功！');
        navigate('/');
      } else {
        message.error(res.message || '注册失败');
      }
    } catch {
      message.error('注册失败，请稍后再试');
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
          <p className="login-subtitle">全球顶级 AI 订阅，一键开通</p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form layout="vertical" onFinish={onLogin} size="large" autoComplete="off">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      className="submit-btn"
                    >
                      登录
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
              label: '注册',
              children: (
                <Form layout="vertical" onFinish={onRegister} size="large" autoComplete="off">
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="email">
                    <Input prefix={<MailOutlined />} placeholder="邮箱（选填）" />
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
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      className="submit-btn"
                    >
                      注册
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
    </div>
  );
};

export default LoginPage;
