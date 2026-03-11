import {
  CrownOutlined,
  KeyOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  UserOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import wechatQR from '@/assets/images/wechat-links.jpg';
import { AUTH_CONFIG } from '@/constants/app.constants';
import { post } from '@/services';

import './index.less';

interface UserInfo {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      navigate('/login');
      return;
    }
    const info = localStorage.getItem('user_info');
    if (info) {
      setUser(JSON.parse(info));
    }
  }, [navigate]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      message.warning('密码至少 6 位');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const res: any = await post(`/user/${user.id}/update`, { password: newPassword });
      if (res.success) {
        message.success('密码修改成功');
        setChangePwdOpen(false);
        setNewPassword('');
      }
    } catch {
      message.error('修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_CONFIG.USER_TOKEN_KEY);
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      {/* Banner */}
      <div className="profile-banner">
        <div className="banner-pattern" />
        <div className="banner-content">
          <Avatar size={88} icon={<UserOutlined />} className="profile-avatar" />
          <div className="banner-text">
            <h1>{user.username}</h1>
            <div className="profile-badges">
              {user.isAdmin && (
                <span className="badge admin-badge">
                  <CrownOutlined /> 管理员
                </span>
              )}
              <span className="badge member-badge">
                <UserOutlined /> {user.isAdmin ? 'Admin' : '普通用户'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="profile-info-cards">
        <div className="info-card">
          <div className="info-icon">
            <UserOutlined />
          </div>
          <div className="info-detail">
            <span className="info-label">用户名</span>
            <span className="info-value">{user.username}</span>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon email-icon">📧</div>
          <div className="info-detail">
            <span className="info-label">邮箱</span>
            <span className="info-value">{user.email || '未设置'}</span>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon time-icon">📅</div>
          <div className="info-detail">
            <span className="info-label">注册时间</span>
            <span className="info-value">{new Date(user.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="profile-actions-grid">
        <div className="action-card" onClick={() => navigate('/orders')}>
          <ShoppingOutlined className="action-icon orders-icon" />
          <span className="action-label">我的订单</span>
          <span className="action-desc">查看订单记录和状态</span>
        </div>
        <div className="action-card" onClick={() => setChangePwdOpen(true)}>
          <KeyOutlined className="action-icon pwd-icon" />
          <span className="action-label">修改密码</span>
          <span className="action-desc">更新你的登录密码</span>
        </div>
        <div className="action-card" onClick={() => setWechatOpen(true)}>
          <WechatOutlined className="action-icon wechat-icon" />
          <span className="action-label">联系客服</span>
          <span className="action-desc">微信扫码联系我们</span>
        </div>
        <div className="action-card danger" onClick={handleLogout}>
          <LogoutOutlined className="action-icon logout-icon" />
          <span className="action-label">退出登录</span>
          <span className="action-desc">安全退出当前账号</span>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        title="修改密码"
        open={changePwdOpen}
        onOk={handleChangePassword}
        onCancel={() => setChangePwdOpen(false)}
        confirmLoading={saving}
      >
        <Input.Password
          placeholder="请输入新密码（至少 6 位）"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ marginTop: 16 }}
        />
      </Modal>

      {/* WeChat QR Modal */}
      <Modal
        title="微信客服"
        open={wechatOpen}
        onCancel={() => setWechatOpen(false)}
        footer={
          <Button onClick={() => setWechatOpen(false)}>关闭</Button>
        }
        centered
      >
        <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={wechatQR} alt="微信客服" style={{ width: 220, borderRadius: 12, display: 'block' }} />
          <p style={{ marginTop: 12, color: '#64748b' }}>扫码添加微信，咨询任何问题</p>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
