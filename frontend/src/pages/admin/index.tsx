import {
  AlertOutlined,
  AppstoreOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  FireOutlined,
  GiftOutlined,
  ImportOutlined,
  KeyOutlined,
  LoginOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'antd';
import ReactECharts from 'echarts-for-react';

import { useEffect, useState } from 'react';
import type { Key } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ColumnsType } from 'antd/es/table';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { basicUrl, get, post } from '@/services';

import './index.less';

// ---- Types ----

interface OrderItem {
  id: number;
  orderNo: string;
  userId: number;
  username: string;
  planName: string;
  amount: number;
  couponCode: string | null;
  discountAmount: number;
  actualAmount: number;
  status: string;
  adminRemark: string | null;
  createdAt: string;
}

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
  isHot: boolean;
  sortOrder: number;
}

interface CouponItem {
  id: number;
  code: string;
  discountAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  paid: { color: 'blue', label: '已确认收款' },
  processing: { color: 'cyan', label: '开通中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'default', label: '已取消' },
  deleted: { color: 'red', label: '已删除' },
};

interface UserItem {
  id: number;
  username: string;
  email: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface StatsOverview {
  totalUsers: number;
  todayUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  totalPlans: number;
  totalCoupons: number;
}

interface TrendItem {
  date: string;
  orders: number;
  revenue: number;
}

interface AnnouncementItem {
  id: number;
  title: string;
  content: string | null;
  type: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SettingItem {
  id: number;
  key: string;
  value: string;
  description: string;
}

interface AuditLogItem {
  id: number;
  username: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

interface LoginLogItem {
  id: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  failReason: string | null;
  createdAt: string;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  // ---- Dashboard ----
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);

  // ---- Orders ----
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderUsername, setOrderUsername] = useState('');
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [orderStatus, setOrderStatus] = useState<string | undefined>(undefined);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Key[]>([]);

  // ---- Users ----
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');

  // ---- Announcements ----
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [announcementForm] = Form.useForm();

  // ---- Site Settings ----
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState<Record<string, string>>({});

  // ---- Audit Logs ----
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);

  // ---- Login Logs ----
  const [loginLogs, setLoginLogs] = useState<LoginLogItem[]>([]);
  const [loginTotal, setLoginTotal] = useState(0);
  const [loginLoading, setLoginLoading] = useState(false);

  // ---- Plans ----
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [planForm] = Form.useForm();

  // ---- Coupons ----
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [couponForm] = Form.useForm();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      navigate('/login');
      return;
    }
    const info = localStorage.getItem('user_info');
    if (info) {
      const user = JSON.parse(info);
      if (!user.isAdmin) {
        message.error('无权访问管理后台');
        navigate('/');
        return;
      }
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ==================== DASHBOARD ====================

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res: any = await get('/stats/overview');
      if (res.success) setStats(res.data);
      const tRes: any = await get('/stats/trend?days=7');
      if (tRes.success) setTrendData(tRes.data || []);
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  };

  // ==================== USERS ====================

  const fetchUsers = async (username?: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (username) params.set('username', username);
      const qs = params.toString();
      const res: any = await get(`/user/admin/list${qs ? `?${qs}` : ''}`);
      if (res.success) setUsers(res.data || []);
    } catch {
      message.error('加载用户失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleAdmin = (user: UserItem) => {
    modal.confirm({
      title: user.isAdmin ? '取消管理员' : '设为管理员',
      content: `确定要${user.isAdmin ? '取消' : '设置'} ${user.username} 的管理员身份吗？`,
      onOk: async () => {
        const res: any = await post(`/user/admin/${user.id}/toggle-admin`);
        if (res.success) {
          message.success('已更新');
          fetchUsers(searchUsername || undefined);
        }
      },
    });
  };

  const handleToggleActive = (user: UserItem) => {
    modal.confirm({
      title: user.isActive ? '禁用用户' : '启用用户',
      content: `确定要${user.isActive ? '禁用' : '启用'} ${user.username} 吗？`,
      okButtonProps: user.isActive ? { danger: true } : undefined,
      onOk: async () => {
        const res: any = await post(`/user/admin/${user.id}/toggle-active`);
        if (res.success) {
          message.success('已更新');
          fetchUsers(searchUsername || undefined);
        }
      },
    });
  };

  const handleResetPassword = (user: UserItem) => {
    let newPwd = '';
    modal.confirm({
      title: `重置密码 — ${user.username}`,
      content: (
        <Input.Password
          placeholder="请输入新密码（至少 6 位）"
          onChange={e => (newPwd = e.target.value)}
        />
      ),
      onOk: async () => {
        if (!newPwd || newPwd.length < 6) {
          message.warning('密码至少 6 位');
          throw new Error('密码太短');
        }
        const res: any = await post(`/user/admin/${user.id}/reset-password`, {
          newPassword: newPwd,
        });
        if (res.success) {
          message.success('密码已重置');
        }
      },
    });
  };

  const userColumns: ColumnsType<UserItem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 140 },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: v => v || '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, r) => (
        <Space>
          <Tag color={r.isActive ? 'green' : 'red'}>{r.isActive ? '正常' : '已禁用'}</Tag>
          {r.isAdmin && (
            <Tag color="blue">
              <CrownOutlined /> 管理员
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: text => new Date(text).toLocaleString('zh-CN'),
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            icon={<CrownOutlined />}
            size="small"
            type={record.isAdmin ? 'primary' : 'default'}
            onClick={() => handleToggleAdmin(record)}
          >
            {record.isAdmin ? '取消管理员' : '设为管理员'}
          </Button>
          <Button
            icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            size="small"
            danger={record.isActive}
            onClick={() => handleToggleActive(record)}
          >
            {record.isActive ? '禁用' : '启用'}
          </Button>
          <Button icon={<KeyOutlined />} size="small" onClick={() => handleResetPassword(record)} />
        </Space>
      ),
    },
  ];

  // ==================== ANNOUNCEMENTS ====================

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const res: any = await get('/announcement/admin/list');
      if (res.success) setAnnouncements(res.data || []);
    } catch {
      message.error('加载公告失败');
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const openAnnouncementModal = (item?: AnnouncementItem) => {
    if (item) {
      setEditingAnnouncement(item);
      announcementForm.setFieldsValue(item);
    } else {
      setEditingAnnouncement(null);
      announcementForm.resetFields();
    }
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async () => {
    const values = await announcementForm.validateFields();
    let res: any;
    if (editingAnnouncement) {
      res = await post(`/announcement/admin/${editingAnnouncement.id}/update`, values);
    } else {
      res = await post('/announcement/admin/create', values);
    }
    if (res.success) {
      message.success(editingAnnouncement ? '已更新' : '已创建');
      setAnnouncementModalOpen(false);
      fetchAnnouncements();
    }
  };

  const handleDeleteAnnouncement = (item: AnnouncementItem) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除公告「${item.title}」吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const res: any = await post(`/announcement/admin/${item.id}/delete`);
        if (res.success) {
          message.success('已删除');
          fetchAnnouncements();
        }
      },
    });
  };

  // ==================== SITE SETTINGS ====================

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res: any = await get('/setting/admin/list');
      if (res.success) {
        setSettings(res.data || []);
        const map: Record<string, string> = {};
        (res.data || []).forEach((s: SettingItem) => {
          map[s.key] = s.value;
        });
        setSettingsEditing(map);
      }
    } catch {
      message.error('加载设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const items = Object.entries(settingsEditing).map(([key, value]) => ({ key, value }));
    const res: any = await post('/setting/admin/update', { items });
    if (res.success) {
      message.success('设置已保存');
      fetchSettings();
    }
  };

  // ==================== AUDIT LOGS ====================

  const fetchAuditLogs = async (page = 1) => {
    setAuditLoading(true);
    try {
      const res: any = await get(`/audit/admin/list?page=${page}&page_size=20`);
      if (res.success) {
        setAuditLogs(res.data.items || []);
        setAuditTotal(res.data.total || 0);
      }
    } catch {
      message.error('加载操作日志失败');
    } finally {
      setAuditLoading(false);
    }
  };

  // ==================== LOGIN LOGS ====================

  const fetchLoginLogs = async (page = 1) => {
    setLoginLoading(true);
    try {
      const res: any = await get(`/audit/admin/login-logs?page=${page}&page_size=20`);
      if (res.success) {
        setLoginLogs(res.data.items || []);
        setLoginTotal(res.data.total || 0);
      }
    } catch {
      message.error('加载登录日志失败');
    } finally {
      setLoginLoading(false);
    }
  };

  // ==================== ORDER ENHANCEMENTS ====================

  const handleExportCSV = () => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    const link = document.createElement('a');
    link.href = `${basicUrl}/order/admin/export`;
    // Use fetch with auth header
    fetch(`${basicUrl}/order/admin/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = 'orders.csv';
        link.click();
        URL.revokeObjectURL(url);
        message.success('CSV 已导出');
      })
      .catch(() => message.error('导出失败'));
  };

  const handleBatchConfirm = () => {
    if (selectedOrderIds.length === 0) {
      message.warning('请先选择订单');
      return;
    }
    modal.confirm({
      title: `批量确认收款`,
      content: `确定要批量确认 ${selectedOrderIds.length} 笔订单的收款吗？`,
      onOk: async () => {
        const res: any = await post('/order/admin/batch-confirm', { ids: selectedOrderIds });
        if (res.success) {
          message.success(`已确认 ${res.data.confirmed} 笔`);
          setSelectedOrderIds([]);
          fetchOrders();
        }
      },
    });
  };

  const handleBatchStatus = (status: string) => {
    if (selectedOrderIds.length === 0) {
      message.warning('请先选择订单');
      return;
    }
    modal.confirm({
      title: `批量更新状态`,
      content: `确定要将 ${selectedOrderIds.length} 笔订单更新为${statusMap[status]?.label || status}吗？`,
      onOk: async () => {
        const res: any = await post('/order/admin/batch-status', { ids: selectedOrderIds, status });
        if (res.success) {
          message.success(`已更新 ${res.data.updated} 笔`);
          setSelectedOrderIds([]);
          fetchOrders();
        }
      },
    });
  };

  // ==================== ORDERS ====================

  const fetchOrders = async (username?: string, orderNo?: string, status?: string) => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (username) params.set('username', username);
      if (orderNo) params.set('order_no', orderNo);
      if (status) params.set('status', status);
      const qs = params.toString();
      const res: any = await get(`/order/admin/list${qs ? `?${qs}` : ''}`);
      if (res.success) setOrders(res.data || []);
    } catch {
      message.error('加载订单失败');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderSearch = () => {
    fetchOrders(orderUsername, searchOrderNo, orderStatus);
  };

  const handleConfirmPaid = (order: OrderItem) => {
    let remark = '';
    modal.confirm({
      title: `确认收款 — ${order.orderNo}`,
      content: (
        <div>
          <p>
            用户: {order.username} | 套餐: {order.planName} | 实付: ¥{order.actualAmount}
          </p>
          <Input.TextArea
            placeholder="管理员备注（选填）"
            onChange={e => (remark = e.target.value)}
            rows={2}
          />
        </div>
      ),
      onOk: async () => {
        const res: any = await post(`/order/admin/${order.id}/confirm`, {
          adminRemark: remark || undefined,
        });
        if (res.success) {
          message.success('已确认收款');
          handleOrderSearch();
        }
      },
    });
  };

  const handleChangeStatus = (order: OrderItem) => {
    let newStatus = '';
    let remark = '';
    modal.confirm({
      title: `更新状态 — ${order.orderNo}`,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <Select
            placeholder="选择新状态"
            options={[
              { label: '开通中', value: 'processing' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' },
              { label: '已删除', value: 'deleted' },
            ]}
            onChange={v => (newStatus = v)}
            style={{ width: '100%' }}
          />
          <Input.TextArea
            placeholder="管理员备注（选填）"
            onChange={e => (remark = e.target.value)}
            rows={2}
          />
        </div>
      ),
      onOk: async () => {
        if (!newStatus) {
          message.warning('请选择状态');
          return;
        }
        const res: any = await post(`/order/admin/${order.id}/status`, {
          status: newStatus,
          adminRemark: remark || undefined,
        });
        if (res.success) {
          message.success('状态已更新');
          handleOrderSearch();
        }
      },
    });
  };

  const orderColumns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: text => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
      width: 200,
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 100,
    },
    {
      title: '套餐',
      dataIndex: 'planName',
      key: 'planName',
    },
    {
      title: '金额',
      key: 'amount',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>实付 ¥{record.actualAmount}</div>
          {record.discountAmount > 0 && (
            <div style={{ fontSize: 12, color: '#10b981' }}>
              优惠 ¥{record.discountAmount}（码: {record.couponCode}）
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status] || { color: 'default', label: status };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
      width: 120,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: text => new Date(text).toLocaleString('zh-CN'),
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {record.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => handleConfirmPaid(record)}>
              确认收款
            </Button>
          )}
          {['paid', 'processing'].includes(record.status) && (
            <Button size="small" onClick={() => handleChangeStatus(record)}>
              更新状态
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ==================== PLANS ====================

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res: any = await get('/plan/admin/list');
      if (res.success) setPlans(res.data || []);
    } catch {
      message.error('加载套餐失败');
    } finally {
      setPlansLoading(false);
    }
  };

  const openPlanModal = (plan?: PlanItem) => {
    if (plan) {
      setEditingPlan(plan);
      planForm.setFieldsValue({
        name: plan.name,
        description: plan.description,
        provider: plan.provider,
        durationDays: plan.durationDays,
        price: plan.price,
        originalPrice: plan.originalPrice,
        features: (plan.features || []).join('\n'),
        isActive: plan.isActive,
        isHot: plan.isHot,
        sortOrder: plan.sortOrder,
      });
    } else {
      setEditingPlan(null);
      planForm.resetFields();
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    const values = await planForm.validateFields();
    const features = values.features
      ? values.features
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
    const payload = { ...values, features };

    let res: any;
    if (editingPlan) {
      res = await post(`/plan/${editingPlan.id}/update`, payload);
    } else {
      res = await post('/plan/create', payload);
    }
    if (res.success) {
      message.success(editingPlan ? '套餐已更新' : '套餐已创建');
      setPlanModalOpen(false);
      fetchPlans();
    }
  };

  const handleDeletePlan = (plan: PlanItem) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除套餐「${plan.name}」吗？此操作不可撤销。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const res: any = await post(`/plan/${plan.id}/delete`);
        if (res.success) {
          message.success('已删除');
          fetchPlans();
        }
      },
    });
  };

  const handleToggleHot = async (plan: PlanItem) => {
    const res: any = await post(`/plan/${plan.id}/update`, { isHot: !plan.isHot });
    if (res.success) {
      message.success(plan.isHot ? '已取消热门' : '已标记热门');
      fetchPlans();
    }
  };

  const handleImportJSON = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
      const res = await fetch(`${basicUrl}/plan/admin/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        message.success(`导入成功：${data.data.imported} 个套餐`);
        fetchPlans();
      } else {
        message.error(data.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    }
  };

  const planColumns: ColumnsType<PlanItem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '服务商', dataIndex: 'provider', key: 'provider', width: 100 },
    {
      title: '价格',
      key: 'price',
      width: 100,
      render: (_, r) => `¥${r.price}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, r) => (
        <Space>
          <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? '上架' : '下架'}</Tag>
          {r.isHot && <Tag color="volcano">🔥 热门</Tag>}
        </Space>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openPlanModal(record)}>
            编辑
          </Button>
          <Button
            icon={<FireOutlined />}
            size="small"
            type={record.isHot ? 'primary' : 'default'}
            danger={record.isHot}
            onClick={() => handleToggleHot(record)}
          >
            {record.isHot ? '取消热门' : '热门'}
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeletePlan(record)}
          />
        </Space>
      ),
    },
  ];

  // ==================== COUPONS ====================

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res: any = await get('/coupon/admin/list');
      if (res.success) setCoupons(res.data || []);
    } catch {
      message.error('加载优惠码失败');
    } finally {
      setCouponsLoading(false);
    }
  };

  const openCouponModal = (coupon?: CouponItem) => {
    if (coupon) {
      setEditingCoupon(coupon);
      couponForm.setFieldsValue({
        code: coupon.code,
        discountAmount: coupon.discountAmount,
        maxUses: coupon.maxUses,
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      couponForm.resetFields();
    }
    setCouponModalOpen(true);
  };

  const handleImportCouponsJSON = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
      const res = await fetch(`${basicUrl}/coupon/admin/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        message.success(`导入成功：${data.data.imported} 个优惠码`);
        fetchCoupons();
      } else {
        message.error(data.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    }
  };

  const handleSaveCoupon = async () => {
    const values = await couponForm.validateFields();
    let res: any;
    if (editingCoupon) {
      res = await post(`/coupon/admin/${editingCoupon.id}/update`, values);
    } else {
      res = await post('/coupon/admin/create', values);
    }
    if (res.success) {
      message.success(editingCoupon ? '优惠码已更新' : '优惠码已创建');
      setCouponModalOpen(false);
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = (coupon: CouponItem) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除优惠码「${coupon.code}」吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const res: any = await post(`/coupon/admin/${coupon.id}/delete`);
        if (res.success) {
          message.success('已删除');
          fetchCoupons();
        }
      },
    });
  };

  const couponColumns: ColumnsType<CouponItem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '优惠码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: text => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '减免',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      render: v => `¥${v}`,
      width: 80,
    },
    {
      title: '已用 / 上限',
      key: 'usage',
      width: 120,
      render: (_, r) => `${r.usedCount} / ${r.maxUses}`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: v => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openCouponModal(record)}>
            编辑
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeleteCoupon(record)}
          />
        </Space>
      ),
    },
  ];

  // ==================== TABS ====================

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined /> 数据概览
        </span>
      ),
      children: (
        <div>
          {statsLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div
                    className="stat-card-icon"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                  >
                    <TeamOutlined />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">{stats.totalUsers}</span>
                    <span className="stat-card-label">总用户</span>
                  </div>
                  <div className="stat-card-extra">今日 +{stats.todayUsers}</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-card-icon"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                  >
                    <FileTextOutlined />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">{stats.totalOrders}</span>
                    <span className="stat-card-label">总订单</span>
                  </div>
                  <div className="stat-card-extra">{stats.pendingOrders} 待处理</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-card-icon"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
                  >
                    ¥
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">¥{stats.totalRevenue.toFixed(0)}</span>
                    <span className="stat-card-label">总收入</span>
                  </div>
                  <div className="stat-card-extra">今日 ¥{stats.todayRevenue.toFixed(0)}</div>
                </div>
                <div className="stat-card">
                  <div
                    className="stat-card-icon"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    <AppstoreOutlined />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">{stats.totalPlans}</span>
                    <span className="stat-card-label">套餐</span>
                  </div>
                  <div className="stat-card-extra">{stats.totalCoupons} 优惠码</div>
                </div>
              </div>
              {trendData.length > 0 && (
                <div className="trend-chart-card">
                  <h3>近 7 天趋势</h3>
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis' },
                      legend: { data: ['订单数', '收入 (¥)'], top: 0, left: 'center' },
                      grid: { left: 50, right: 50, top: 50, bottom: 40 },
                      xAxis: { type: 'category', data: trendData.map(t => t.date.slice(5)) },
                      yAxis: [
                        { type: 'value', name: '订单', minInterval: 1 },
                        { type: 'value', name: '收入', position: 'right' },
                      ],
                      series: [
                        {
                          name: '订单数',
                          type: 'bar',
                          data: trendData.map(t => t.orders),
                          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
                        },
                        {
                          name: '收入 (¥)',
                          type: 'line',
                          yAxisIndex: 1,
                          data: trendData.map(t => t.revenue),
                          smooth: true,
                          itemStyle: { color: '#10b981' },
                        },
                      ],
                    }}
                    style={{ height: 300 }}
                  />
                </div>
              )}
            </>
          ) : null}
        </div>
      ),
    },
    {
      key: 'orders',
      label: (
        <span>
          <FileTextOutlined /> 订单管理
        </span>
      ),
      children: (
        <div>
          <div className="admin-filter-bar">
            <Input
              placeholder="搜索订单号"
              prefix={<SearchOutlined />}
              value={searchOrderNo}
              onChange={e => setSearchOrderNo(e.target.value)}
              onPressEnter={handleOrderSearch}
              style={{ width: 200 }}
              allowClear
            />
            <Input
              placeholder="搜索用户名"
              prefix={<SearchOutlined />}
              value={orderUsername}
              onChange={e => setOrderUsername(e.target.value)}
              onPressEnter={handleOrderSearch}
              style={{ width: 140 }}
              allowClear
            />
            <Select
              placeholder="订单状态"
              value={orderStatus}
              onChange={v => setOrderStatus(v)}
              allowClear
              style={{ width: 130 }}
              options={Object.entries(statusMap).map(([k, v]) => ({ label: v.label, value: k }))}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleOrderSearch}>
              搜索
            </Button>
            <Button icon={<SyncOutlined />} onClick={() => fetchOrders()}>
              刷新
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
              导出 CSV
            </Button>
            {selectedOrderIds.length > 0 && (
              <>
                <Button type="primary" onClick={handleBatchConfirm}>
                  批量确认收款 ({selectedOrderIds.length})
                </Button>
                <Select
                  placeholder="批量更新状态"
                  style={{ width: 150 }}
                  onChange={handleBatchStatus}
                  options={[
                    { label: '开通中', value: 'processing' },
                    { label: '已完成', value: 'completed' },
                    { label: '已取消', value: 'cancelled' },
                  ]}
                />
              </>
            )}
          </div>
          {ordersLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={orderColumns}
              dataSource={orders}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              className="admin-table"
              scroll={{ x: 1100 }}
              rowSelection={{
                selectedRowKeys: selectedOrderIds,
                onChange: keys => setSelectedOrderIds(keys),
              }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'users',
      label: (
        <span>
          <TeamOutlined /> 用户管理
        </span>
      ),
      children: (
        <div>
          <div className="admin-filter-bar">
            <Input
              placeholder="搜索用户名"
              prefix={<SearchOutlined />}
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              onPressEnter={() => fetchUsers(searchUsername || undefined)}
              style={{ width: 220 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchUsers(searchUsername || undefined)}
            >
              搜索
            </Button>
            <Button icon={<SyncOutlined />} onClick={() => fetchUsers()}>
              刷新
            </Button>
          </div>
          {usersLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              className="admin-table"
              scroll={{ x: 900 }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'plans',
      label: (
        <span>
          <AppstoreOutlined /> 套餐管理
        </span>
      ),
      children: (
        <div>
          <div className="admin-filter-bar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlanModal()}>
              新建套餐
            </Button>
            <Upload
              accept=".json"
              showUploadList={false}
              beforeUpload={file => {
                handleImportJSON(file);
                return false;
              }}
            >
              <Button icon={<ImportOutlined />}>导入 JSON</Button>
            </Upload>
            <Button icon={<SyncOutlined />} onClick={fetchPlans}>
              刷新
            </Button>
          </div>
          {plansLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={planColumns}
              dataSource={plans}
              rowKey="id"
              pagination={false}
              className="admin-table"
              scroll={{ x: 800 }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'coupons',
      label: (
        <span>
          <GiftOutlined /> 优惠码管理
        </span>
      ),
      children: (
        <div>
          <div className="admin-filter-bar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCouponModal()}>
              新建优惠码
            </Button>
            <Upload
              accept=".json"
              showUploadList={false}
              beforeUpload={file => {
                handleImportCouponsJSON(file);
                return false;
              }}
            >
              <Button icon={<ImportOutlined />}>导入 JSON</Button>
            </Upload>
            <Button icon={<SyncOutlined />} onClick={fetchCoupons}>
              刷新
            </Button>
          </div>
          {couponsLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={couponColumns}
              dataSource={coupons}
              rowKey="id"
              pagination={false}
              className="admin-table"
            />
          )}
        </div>
      ),
    },
    {
      key: 'announcements',
      label: (
        <span>
          <AlertOutlined /> 公告管理
        </span>
      ),
      children: (
        <div>
          <div className="admin-filter-bar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAnnouncementModal()}>
              新建公告
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchAnnouncements}>
              刷新
            </Button>
          </div>
          {announcementsLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={
                [
                  { title: 'ID', dataIndex: 'id', width: 60 },
                  { title: '标题', dataIndex: 'title', width: 200 },
                  { title: '内容', dataIndex: 'content', ellipsis: true },
                  {
                    title: '类型',
                    dataIndex: 'type',
                    width: 80,
                    render: (v: string) => (
                      <Tag color={v === 'warning' ? 'orange' : v === 'success' ? 'green' : 'blue'}>
                        {v}
                      </Tag>
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'isActive',
                    width: 80,
                    render: (v: boolean) => (
                      <Tag color={v ? 'green' : 'default'}>{v ? '显示' : '隐藏'}</Tag>
                    ),
                  },
                  {
                    title: '操作',
                    width: 160,
                    render: (_: unknown, r: AnnouncementItem) => (
                      <Space>
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => openAnnouncementModal(r)}
                        >
                          编辑
                        </Button>
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          onClick={() => handleDeleteAnnouncement(r)}
                        />
                      </Space>
                    ),
                  },
                ] as ColumnsType<AnnouncementItem>
              }
              dataSource={announcements}
              rowKey="id"
              pagination={false}
              className="admin-table"
            />
          )}
        </div>
      ),
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined /> 站点设置
        </span>
      ),
      children: (
        <div>
          {settingsLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <div className="settings-list">
              {settings.map(s => (
                <div key={s.key} className="setting-item">
                  <div className="setting-label">
                    <strong>{s.description}</strong>
                    <span className="setting-key">{s.key}</span>
                  </div>
                  <Input
                    value={settingsEditing[s.key] ?? s.value}
                    onChange={e =>
                      setSettingsEditing(prev => ({ ...prev, [s.key]: e.target.value }))
                    }
                    style={{ width: 360 }}
                  />
                </div>
              ))}
              <Button type="primary" onClick={handleSaveSettings} style={{ marginTop: 16 }}>
                保存设置
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'audit',
      label: (
        <span>
          <AuditOutlined /> 操作日志
        </span>
      ),
      children: (
        <div>
          {auditLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={
                [
                  {
                    title: '时间',
                    dataIndex: 'createdAt',
                    width: 170,
                    render: (t: string) => new Date(t).toLocaleString('zh-CN'),
                  },
                  { title: '操作人', dataIndex: 'username', width: 100 },
                  { title: '操作', dataIndex: 'action', width: 150 },
                  { title: '目标', dataIndex: 'targetType', width: 80 },
                  { title: 'ID', dataIndex: 'targetId', width: 60 },
                  { title: '详情', dataIndex: 'detail', ellipsis: true },
                ] as ColumnsType<AuditLogItem>
              }
              dataSource={auditLogs}
              rowKey="id"
              pagination={{ total: auditTotal, pageSize: 20, onChange: p => fetchAuditLogs(p) }}
              className="admin-table"
            />
          )}
        </div>
      ),
    },
    {
      key: 'loginLogs',
      label: (
        <span>
          <LoginOutlined /> 登录日志
        </span>
      ),
      children: (
        <div>
          {loginLoading ? (
            <div className="admin-loading">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={
                [
                  {
                    title: '时间',
                    dataIndex: 'createdAt',
                    width: 170,
                    render: (t: string) => new Date(t).toLocaleString('zh-CN'),
                  },
                  { title: '用户名', dataIndex: 'username', width: 120 },
                  { title: 'IP', dataIndex: 'ip', width: 140 },
                  {
                    title: '结果',
                    dataIndex: 'success',
                    width: 80,
                    render: (v: boolean) => (
                      <Tag color={v ? 'green' : 'red'}>{v ? '成功' : '失败'}</Tag>
                    ),
                  },
                  { title: '失败原因', dataIndex: 'failReason', width: 150 },
                  { title: '浏览器', dataIndex: 'userAgent', ellipsis: true },
                ] as ColumnsType<LoginLogItem>
              }
              dataSource={loginLogs}
              rowKey="id"
              pagination={{ total: loginTotal, pageSize: 20, onChange: p => fetchLoginLogs(p) }}
              className="admin-table"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>管理后台</h1>
      </div>

      <Tabs
        defaultActiveKey="dashboard"
        items={tabItems}
        onChange={key => {
          if (key === 'dashboard') fetchStats();
          else if (key === 'orders') fetchOrders();
          else if (key === 'users') fetchUsers();
          else if (key === 'plans') fetchPlans();
          else if (key === 'coupons') fetchCoupons();
          else if (key === 'announcements') fetchAnnouncements();
          else if (key === 'settings') fetchSettings();
          else if (key === 'audit') fetchAuditLogs();
          else if (key === 'loginLogs') fetchLoginLogs();
        }}
        className="admin-tabs"
      />

      {/* Plan Modal */}
      <Modal
        title={editingPlan ? '编辑套餐' : '新建套餐'}
        open={planModalOpen}
        onOk={handleSavePlan}
        onCancel={() => setPlanModalOpen(false)}
        width={560}
        centered
      >
        <Form
          form={planForm}
          layout="vertical"
          initialValues={{ durationDays: 30, sortOrder: 0, isActive: true, isHot: false }}
        >
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="例如：Claude Pro" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="套餐简要描述" />
          </Form.Item>
          <Form.Item name="provider" label="服务商" rules={[{ required: true }]}>
            <Input placeholder="例如：Anthropic" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="price" label="售价" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
            </Form.Item>
            <Form.Item name="originalPrice" label="原价">
              <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
            </Form.Item>
            <Form.Item name="durationDays" label="有效天数">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </div>
          <Form.Item name="features" label="功能特性（每行一个）">
            <Input.TextArea
              rows={4}
              placeholder="每行一个特性，例如：&#10;Claude Opus 4.6 解锁使用&#10;200K 超长上下文"
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="isActive" label="上架" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isHot" label="热门推荐" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Coupon Modal */}
      <Modal
        title={editingCoupon ? '编辑优惠码' : '新建优惠码'}
        open={couponModalOpen}
        onOk={handleSaveCoupon}
        onCancel={() => setCouponModalOpen(false)}
        width={440}
        centered
      >
        <Form form={couponForm} layout="vertical" initialValues={{ maxUses: 1, isActive: true }}>
          <Form.Item name="code" label="优惠码" rules={[{ required: true }]}>
            <Input placeholder="例如：WELCOMEAI" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="discountAmount" label="减免金额" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
            </Form.Item>
            <Form.Item name="maxUses" label="最大使用次数">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </div>
          <Form.Item name="isActive" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Announcement Modal */}
      <Modal
        title={editingAnnouncement ? '编辑公告' : '新建公告'}
        open={announcementModalOpen}
        onOk={handleSaveAnnouncement}
        onCancel={() => setAnnouncementModalOpen(false)}
        width={500}
        centered
      >
        <Form
          form={announcementForm}
          layout="vertical"
          initialValues={{ type: 'info', isActive: true, sortOrder: 0 }}
        >
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="公告标题" />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={3} placeholder="公告内容" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="type" label="类型">
              <Select
                options={[
                  { label: '信息', value: 'info' },
                  { label: '警告', value: 'warning' },
                  { label: '成功', value: 'success' },
                ]}
              />
            </Form.Item>
            <Form.Item name="isActive" label="显示" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPage;
