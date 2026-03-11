import { UserOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Card, Descriptions, Input, Modal } from 'antd';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      <Card className="profile-card">
        <div className="profile-header">
          <Avatar size={72} icon={<UserOutlined />} className="profile-avatar" />
          <div className="profile-name">
            <h2>{user.username}</h2>
            <span className="profile-role">{user.isAdmin ? '管理员' : '普通用户'}</span>
          </div>
        </div>

        <Descriptions column={1} className="profile-info" bordered>
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {new Date(user.createdAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>

        <div className="profile-actions">
          <Button onClick={() => navigate('/orders')}>我的订单</Button>
          <Button onClick={() => setChangePwdOpen(true)}>修改密码</Button>
          <Button danger onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </Card>

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
          onChange={e => setNewPassword(e.target.value)}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;
