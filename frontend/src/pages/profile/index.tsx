import {
  CopyOutlined,
  EditOutlined,
  KeyOutlined,
  LogoutOutlined,
  MessageOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Form, Input, Modal, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { useAppPreferences } from '@/contexts/app-preferences';
import { get, post } from '@/services';

import './index.less';

interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
  subscriptionExpiresAt: string | null;
  inviteCode: string;
  rewardBalance: number;
}

interface ProfileSummary {
  user: UserInfo;
  orderCount: number;
  completedOrderCount: number;
  openTicketCount: number;
}

interface TicketItem {
  id: number;
  subject: string;
  content: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InviteRewardItem {
  id: number;
  rewardType: string;
  rewardAmount: number;
  couponCode: string | null;
  inviteeUsername: string | null;
  createdAt: string;
}

interface InviteOverview {
  inviteCode: string;
  inviteLink: string;
  rewardBalance: number;
  rewardCount: number;
  totalRewardAmount: number;
  invitedUserCount: number;
  rewards: InviteRewardItem[];
}

interface ProfileEditFormValues {
  username: string;
  email?: string;
}

const ticketStatusMap: Record<string, { color: string; label: string }> = {
  open: { color: 'orange', label: '待处理' },
  processing: { color: 'blue', label: '处理中' },
  replied: { color: 'green', label: '已回复' },
  closed: { color: 'default', label: '已关闭' },
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useAppPreferences();
  const [profileForm] = Form.useForm<ProfileEditFormValues>();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [inviteOverview, setInviteOverview] = useState<InviteOverview | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketContent, setTicketContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      navigate('/login');
      return;
    }
    void Promise.all([fetchSummary(), fetchTickets(), fetchInviteOverview()]);
  }, [navigate]);

  /**
   * 加载个人中心摘要信息，统一展示账号、订阅和订单统计。
   */
  const fetchSummary = async () => {
    const res: any = await get('/user/profile/summary');
    if (res.success) {
      setSummary(res.data);
      localStorage.setItem(AUTH_CONFIG.USER_INFO_KEY, JSON.stringify(res.data.user));
    }
  };

  const fetchTickets = async () => {
    const res: any = await get('/ticket');
    if (res.success) {
      setTickets(res.data || []);
    }
  };

  const fetchInviteOverview = async () => {
    const res: any = await get('/invite/overview');
    if (res.success) {
      setInviteOverview(res.data);
    }
  };

  /**
   * 打开资料编辑弹窗，并回填当前用户资料。
   */
  const handleOpenEditProfile = () => {
    if (!summary) {
      return;
    }
    profileForm.setFieldsValue({
      username: summary.user.username,
      email: summary.user.email || '',
    });
    setEditProfileOpen(true);
  };

  /**
   * 提交用户基础资料更新，并同步刷新个人中心摘要和本地登录态。
   */
  const handleUpdateProfile = async () => {
    if (!summary) {
      return;
    }

    try {
      const values = await profileForm.validateFields();
      setSaving(true);
      const res: any = await post(`/user/${summary.user.id}/update`, {
        username: values.username.trim(),
        email: values.email?.trim() || null,
      });
      if (res.success) {
        await fetchSummary();
        message.success('用户信息已更新');
        setEditProfileOpen(false);
      }
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!summary || !newPassword || newPassword.length < 6) {
      message.warning('密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      const res: any = await post(`/user/${summary.user.id}/update`, { password: newPassword });
      if (res.success) {
        message.success('密码修改成功');
        setChangePwdOpen(false);
        setNewPassword('');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketContent.trim()) {
      message.warning('请完整填写工单内容');
      return;
    }
    const res: any = await post('/ticket', {
      subject: ticketSubject.trim(),
      content: ticketContent.trim(),
    });
    if (res.success) {
      message.success('工单已提交');
      setTicketModalOpen(false);
      setTicketSubject('');
      setTicketContent('');
      fetchTickets();
      fetchSummary();
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteOverview) {
      return;
    }
    await navigator.clipboard.writeText(inviteOverview.inviteLink);
    message.success('邀请链接已复制');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_CONFIG.USER_TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_INFO_KEY);
    navigate('/login');
  };

  if (!summary) {
    return null;
  }

  const { user } = summary;
  const joinedDateLabel = new Date(user.createdAt).toLocaleDateString();
  const subscriptionLabel = user.subscriptionExpiresAt
    ? `订阅至 ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`
    : '暂无有效订阅';
  const subscriptionDetailLabel = user.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleString()
    : '暂无有效订阅';

  return (
    <div className="profile-page">
      <div className="profile-banner">
        <div className="banner-pattern" />
        <div className="banner-content">
          <div className="banner-main">
            <Avatar size={88} icon={<UserOutlined />} className="profile-avatar" />
            <div className="banner-text">
              <h1>{user.username}</h1>
              <p className="banner-subline">
                <span>{user.email || '暂未设置邮箱'}</span>
                <span>邀请码 {user.inviteCode}</span>
                <span>注册于 {joinedDateLabel}</span>
              </p>
              <div className="profile-badges">
                {user.isAdmin && <span className="badge admin-badge">Admin</span>}
                <span className="badge member-badge">{subscriptionLabel}</span>
              </div>
            </div>
          </div>
          <div className="banner-glance">
            <div className="banner-glance-item">
              <span>累计订单</span>
              <strong>{summary.orderCount}</strong>
            </div>
            <div className="banner-glance-item">
              <span>待处理工单</span>
              <strong>{summary.openTicketCount}</strong>
            </div>
            <div className="banner-glance-item">
              <span>返利余额</span>
              <strong>¥{user.rewardBalance.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-info-cards">
        <div className="info-card">
          <div className="info-icon">📧</div>
          <div className="info-detail">
            <span className="info-label">邮箱</span>
            <span className="info-value">{user.email || '未设置'}</span>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon">⏰</div>
          <div className="info-detail">
            <span className="info-label">订阅到期</span>
            <span className="info-value">{subscriptionDetailLabel}</span>
          </div>
        </div>
        <div className="info-card">
          <div className="info-icon">💰</div>
          <div className="info-detail">
            <span className="info-label">邀请返利</span>
            <span className="info-value">¥{user.rewardBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="profile-actions-grid">
        <div className="action-card" onClick={handleOpenEditProfile}>
          <EditOutlined className="action-icon edit-icon" />
          <span className="action-label">修改资料</span>
          <span className="action-desc">更新用户名和邮箱信息</span>
        </div>
        <div className="action-card" onClick={() => navigate('/orders')}>
          <ShoppingOutlined className="action-icon orders-icon" />
          <span className="action-label">{t('orders')}</span>
          <span className="action-desc">{summary.orderCount} 笔订单 / {summary.completedOrderCount} 笔成交</span>
        </div>
        <div className="action-card" onClick={() => setChangePwdOpen(true)}>
          <KeyOutlined className="action-icon pwd-icon" />
          <span className="action-label">修改密码</span>
          <span className="action-desc">更新登录安全凭证</span>
        </div>
        <div className="action-card" onClick={() => setTicketModalOpen(true)}>
          <MessageOutlined className="action-icon wechat-icon" />
          <span className="action-label">{t('ticketCenter')}</span>
          <span className="action-desc">{summary.openTicketCount} 个待处理工单</span>
        </div>
        <div className="action-card danger" onClick={handleLogout}>
          <LogoutOutlined className="action-icon logout-icon" />
          <span className="action-label">{t('logout')}</span>
          <span className="action-desc">安全退出当前账号</span>
        </div>
      </div>

      <Tabs
        className="profile-tabs"
        items={[
          {
            key: 'invite',
            label: t('inviteRewards'),
            children: (
              <div className="surface-card profile-panel">
                <div className="profile-panel-header">
                  <div>
                    <h3>邀请码：{inviteOverview?.inviteCode || user.inviteCode}</h3>
                    <p>邀请好友下单后，系统会自动发放返利或优惠券奖励。</p>
                  </div>
                  <Button icon={<CopyOutlined />} onClick={handleCopyInviteLink}>
                    复制邀请链接
                  </Button>
                </div>
                <div className="profile-grid-stats">
                  <div className="profile-stat-card">
                    <span>邀请人数</span>
                    <strong>{inviteOverview?.invitedUserCount || 0}</strong>
                  </div>
                  <div className="profile-stat-card">
                    <span>累计奖励</span>
                    <strong>¥{inviteOverview?.totalRewardAmount.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div className="profile-stat-card">
                    <span>当前返利</span>
                    <strong>¥{inviteOverview?.rewardBalance.toFixed(2) || '0.00'}</strong>
                  </div>
                </div>
                <div className="profile-list">
                  {(inviteOverview?.rewards || []).map(item => (
                    <div key={item.id} className="profile-list-item">
                      <div>
                        <strong>{item.inviteeUsername || '匿名用户'}</strong>
                        <p>{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="profile-list-side">
                        <Tag color={item.rewardType === 'cash' ? 'green' : 'blue'}>
                          {item.rewardType === 'cash' ? '返现' : '优惠券'}
                        </Tag>
                        <span>¥{item.rewardAmount}</span>
                        {item.couponCode && <small>{item.couponCode}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'tickets',
            label: t('ticketCenter'),
            children: (
              <div className="surface-card profile-panel">
                <div className="profile-panel-header">
                  <div>
                    <h3>工单记录</h3>
                    <p>可以在这里查看处理进度和管理员回复。</p>
                  </div>
                  <Button type="primary" onClick={() => setTicketModalOpen(true)}>
                    新建工单
                  </Button>
                </div>
                <div className="profile-list">
                  {tickets.map(ticket => {
                    const statusItem = ticketStatusMap[ticket.status] || {
                      color: 'default',
                      label: ticket.status,
                    };
                    return (
                      <div key={ticket.id} className="profile-list-item ticket-item">
                        <div>
                          <strong>{ticket.subject}</strong>
                          <p>{ticket.content}</p>
                          {ticket.adminReply && <small>管理员回复：{ticket.adminReply}</small>}
                        </div>
                        <div className="profile-list-side">
                          <Tag color={statusItem.color}>{statusItem.label}</Tag>
                          <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="修改用户信息"
        open={editProfileOpen}
        onOk={handleUpdateProfile}
        onCancel={() => setEditProfileOpen(false)}
        confirmLoading={saving}
      >
        <Form form={profileForm} layout="vertical" autoComplete="off">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { whitespace: true, message: '用户名不能为空' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱，留空表示未设置" />
          </Form.Item>
        </Form>
      </Modal>

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
          onChange={event => setNewPassword(event.target.value)}
        />
      </Modal>

      <Modal
        title="提交工单"
        open={ticketModalOpen}
        onOk={handleCreateTicket}
        onCancel={() => setTicketModalOpen(false)}
      >
        <Input
          placeholder="工单标题"
          value={ticketSubject}
          onChange={event => setTicketSubject(event.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input.TextArea
          rows={5}
          placeholder="请尽量描述清楚问题、订单号和期望结果"
          value={ticketContent}
          onChange={event => setTicketContent(event.target.value)}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;
