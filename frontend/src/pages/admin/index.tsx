import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CrownOutlined,
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  GiftOutlined,
  ImportOutlined,
  KeyOutlined,
  MessageOutlined,
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
  Descriptions,
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
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ColumnsType } from 'antd/es/table';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { useAppPreferences } from '@/contexts/app-preferences';
import { basicUrl, get, post } from '@/services';

import './index.less';

interface OverviewStats {
  totalUsers: number;
  todayUsers: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  activeSubscriptions: number;
  openTickets: number;
  totalPlans: number;
  inviteRewards: number;
}

interface RetentionItem {
  date: string;
  newCustomers: number;
  retainedCustomers: number;
  retentionRate: number;
}

interface PlanSalesItem {
  planName: string;
  count: number;
  revenue: number;
  revenueShare: number;
}

interface CouponPerformanceItem {
  couponCode: string;
  usedCount: number;
  revenue: number;
}

interface OrderItem {
  id: number;
  orderNo: string;
  username?: string;
  planName: string;
  actualAmount: number;
  discountAmount: number;
  couponCode: string | null;
  paymentMethod: string;
  status: string;
  expireAt: string | null;
  paymentProof: string | null;
  progressNote: string | null;
  refundStatus: string;
  refundAmount: number;
  createdAt: string;
}

interface UserItem {
  id: number;
  username: string;
  email: string | null;
  isActive: boolean;
  isAdmin: boolean;
  inviteCode: string;
  rewardBalance: number;
  subscriptionExpiresAt: string | null;
  createdAt: string;
}

interface TicketItem {
  id: number;
  username: string;
  subject: string;
  content: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

interface PlanItem {
  id: number;
  name: string;
  description: string;
  provider: string;
  durationDays: number;
  price: number;
  originalPrice: number | null;
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

interface SettingItem {
  id: number;
  key: string;
  value: string;
  description: string;
}

interface HealthSnapshot {
  serverTime: string;
  startedAt: string;
  cpuLoad: { load1m: number; load5m: number; load15m: number };
  memory: { totalBytes: number; availableBytes: number; usagePercent: number };
  disk: { totalBytes: number; usedBytes: number; freeBytes: number; usagePercent: number };
  database: Record<string, number | string>;
}

interface BackupItem {
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: number;
}

interface ReportPreview {
  generatedAt: string;
  newUsers: number;
  newOrders: number;
  confirmedOrders: number;
  newRevenue: number;
  refundAmount: number;
  couponOrderCount: number;
  openTickets: number;
  topPlans: { planName: string; count: number; revenue: number }[];
}

/**
 * 统一格式化金额展示，避免统计面板里小数位风格不一致。
 */
function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

const orderStatusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待支付' },
  paid: { color: 'blue', label: '已付款' },
  processing: { color: 'cyan', label: '开通中' },
  completed: { color: 'green', label: '已完成' },
  refunded: { color: 'purple', label: '已退款' },
  cancelled: { color: 'default', label: '已取消' },
};

const ticketStatusMap: Record<string, { color: string; label: string }> = {
  open: { color: 'orange', label: '待处理' },
  processing: { color: 'blue', label: '处理中' },
  replied: { color: 'green', label: '已回复' },
  closed: { color: 'default', label: '已关闭' },
};

const adminTabLabels: Record<string, string> = {
  dashboard: '仪表盘',
  orders: '订单',
  users: '用户',
  tickets: '工单',
  plans: '套餐',
  coupons: '优惠码',
  settings: '站点设置',
  ops: '系统运维',
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { t } = useAppPreferences();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [retention, setRetention] = useState<RetentionItem[]>([]);
  const [planSales, setPlanSales] = useState<PlanSalesItem[]>([]);
  const [couponStats, setCouponStats] = useState<CouponPerformanceItem[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderNoFilter, setOrderNoFilter] = useState('');
  const [orderUsernameFilter, setOrderUsernameFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | undefined>(undefined);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userKeyword, setUserKeyword] = useState('');

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketReplyModalOpen, setTicketReplyModalOpen] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [currentTicket, setCurrentTicket] = useState<TicketItem | null>(null);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [planForm] = Form.useForm();

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [couponForm] = Form.useForm();

  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState<Record<string, string>>({});

  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [backupItems, setBackupItems] = useState<BackupItem[]>([]);
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const totalCouponUses = couponStats.reduce((sum, item) => sum + item.usedCount, 0);
  const totalCouponRevenue = couponStats.reduce((sum, item) => sum + item.revenue, 0);
  const topCoupon = couponStats[0] || null;
  const adminHighlights = [
    {
      key: 'users',
      label: '总用户',
      value: overview ? String(overview.totalUsers) : '--',
      detail: overview ? `今日 +${overview.todayUsers}` : '等待数据同步',
      icon: <TeamOutlined />,
      tone: 'blue',
    },
    {
      key: 'orders',
      label: '订单量',
      value: overview ? String(overview.totalOrders) : '--',
      detail: overview ? `${overview.pendingOrders} 笔待支付` : '等待数据同步',
      icon: <FileTextOutlined />,
      tone: 'green',
    },
    {
      key: 'revenue',
      label: '总收入',
      value: overview ? formatCurrency(overview.totalRevenue) : '--',
      detail: overview ? `今日 ${formatCurrency(overview.todayRevenue)}` : '等待数据同步',
      icon: '¥',
      tone: 'violet',
    },
    {
      key: 'tickets',
      label: '待处理工单',
      value: overview ? String(overview.openTickets) : '--',
      detail: overview ? `${overview.activeSubscriptions} 个活跃订阅` : '等待数据同步',
      icon: <MessageOutlined />,
      tone: 'amber',
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    const rawUser = localStorage.getItem(AUTH_CONFIG.USER_INFO_KEY);
    if (!token || !rawUser) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(rawUser);
    if (!user.isAdmin) {
      message.error('无权访问管理后台');
      navigate('/');
      return;
    }
    void fetchDashboard();
  }, [message, navigate]);

  /**
   * 在切换到对应页签时按需拉取数据，避免一次性请求过多接口。
   */
  const handleTabChange = async (key: string) => {
    setActiveTab(key);
    if (key === 'dashboard') {
      await fetchDashboard();
    } else if (key === 'orders') {
      await fetchOrders();
    } else if (key === 'users') {
      await fetchUsers();
    } else if (key === 'tickets') {
      await fetchTickets();
    } else if (key === 'plans') {
      await fetchPlans();
    } else if (key === 'coupons') {
      await fetchCoupons();
    } else if (key === 'settings') {
      await fetchSettings();
    } else if (key === 'ops') {
      await fetchOpsData();
    }
  };

  const fetchDashboard = async () => {
    setDashboardLoading(true);
    try {
      const [overviewRes, retentionRes, planRes, couponRes] = await Promise.all([
        get('/stats/overview'),
        get('/stats/retention'),
        get('/stats/plan-sales'),
        get('/stats/coupon-performance'),
      ]);
      if ((overviewRes as any).success) setOverview((overviewRes as any).data);
      if ((retentionRes as any).success) setRetention((retentionRes as any).data.curve || []);
      if ((planRes as any).success) setPlanSales((planRes as any).data || []);
      if ((couponRes as any).success) setCouponStats((couponRes as any).data || []);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderNoFilter) params.set('order_no', orderNoFilter);
      if (orderUsernameFilter) params.set('username', orderUsernameFilter);
      if (orderStatusFilter) params.set('status', orderStatusFilter);
      const res: any = await get(`/order/admin/list${params.toString() ? `?${params.toString()}` : ''}`);
      if (res.success) setOrders(res.data || []);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res: any = await get(`/user/admin/list${userKeyword ? `?username=${userKeyword}` : ''}`);
      if (res.success) setUsers(res.data || []);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const res: any = await get('/ticket/admin/list');
      if (res.success) setTickets(res.data || []);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res: any = await get('/plan/admin/list');
      if (res.success) setPlans(res.data || []);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res: any = await get('/coupon/admin/list');
      if (res.success) setCoupons(res.data || []);
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res: any = await get('/setting/admin/list');
      if (res.success) {
        setSettings(res.data || []);
        const nextState: Record<string, string> = {};
        (res.data || []).forEach((item: SettingItem) => {
          nextState[item.key] = item.value;
        });
        setSettingsEditing(nextState);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchOpsData = async () => {
    setOpsLoading(true);
    try {
      const [healthRes, backupRes, reportRes] = await Promise.all([
        get('/ops/health'),
        get('/ops/backup/list'),
        get('/ops/report/preview?days=1'),
      ]);
      if ((healthRes as any).success) setHealth((healthRes as any).data);
      if ((backupRes as any).success) setBackupItems((backupRes as any).data || []);
      if ((reportRes as any).success) setReportPreview((reportRes as any).data);
    } finally {
      setOpsLoading(false);
    }
  };

  const handleConfirmPaid = (order: OrderItem) => {
    let adminRemark = '';
    modal.confirm({
      title: `确认收款 - ${order.orderNo}`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="管理员备注（可选）"
          onChange={event => {
            adminRemark = event.target.value;
          }}
        />
      ),
      onOk: async () => {
        const res: any = await post(`/order/admin/${order.id}/confirm`, {
          adminRemark: adminRemark || undefined,
        });
        if (res.success) {
          message.success('已确认收款');
          fetchOrders();
          fetchDashboard();
        }
      },
    });
  };

  const handleUpdateOrderStatus = (order: OrderItem) => {
    let status = 'processing';
    let progressNote = '';
    modal.confirm({
      title: `更新状态 - ${order.orderNo}`,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            defaultValue="processing"
            options={[
              { label: '开通中', value: 'processing' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' },
            ]}
            onChange={value => {
              status = value;
            }}
          />
          <Input.TextArea
            rows={3}
            placeholder="进度说明"
            onChange={event => {
              progressNote = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        const res: any = await post(`/order/admin/${order.id}/status`, {
          status,
          progressNote: progressNote || undefined,
        });
        if (res.success) {
          message.success('订单状态已更新');
          fetchOrders();
          fetchDashboard();
        }
      },
    });
  };

  const handleRefund = (order: OrderItem) => {
    let refundAmount = order.actualAmount;
    let refundReason = '';
    modal.confirm({
      title: `处理退款 - ${order.orderNo}`,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputNumber
            min={0}
            max={order.actualAmount}
            defaultValue={order.actualAmount}
            style={{ width: '100%' }}
            onChange={value => {
              refundAmount = Number(value || 0);
            }}
          />
          <Input.TextArea
            rows={3}
            placeholder="退款原因"
            onChange={event => {
              refundReason = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        if (!refundReason.trim()) {
          message.warning('请填写退款原因');
          throw new Error('missing refund reason');
        }
        const res: any = await post(`/order/admin/${order.id}/refund`, {
          refundReason: refundReason.trim(),
          refundAmount,
        });
        if (res.success) {
          message.success('退款已记录');
          fetchOrders();
          fetchDashboard();
        }
      },
    });
  };

  const handleToggleAdmin = async (user: UserItem) => {
    const res: any = await post(`/user/admin/${user.id}/toggle-admin`);
    if (res.success) {
      message.success('管理员权限已更新');
      fetchUsers();
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    const res: any = await post(`/user/admin/${user.id}/toggle-active`);
    if (res.success) {
      message.success('用户状态已更新');
      fetchUsers();
    }
  };

  const handleResetPassword = (user: UserItem) => {
    let nextPassword = '';
    modal.confirm({
      title: `重置密码 - ${user.username}`,
      content: (
        <Input.Password
          placeholder="请输入新密码"
          onChange={event => {
            nextPassword = event.target.value;
          }}
        />
      ),
      onOk: async () => {
        if (nextPassword.length < 6) {
          message.warning('密码至少 6 位');
          throw new Error('password too short');
        }
        const res: any = await post(`/user/admin/${user.id}/reset-password`, {
          newPassword: nextPassword,
        });
        if (res.success) {
          message.success('密码已重置');
        }
      },
    });
  };

  const openTicketReplyModal = (ticket: TicketItem) => {
    setCurrentTicket(ticket);
    setTicketReply(ticket.adminReply || '');
    setTicketReplyModalOpen(true);
  };

  const handleReplyTicket = async () => {
    if (!currentTicket || !ticketReply.trim()) {
      message.warning('请输入回复内容');
      return;
    }
    const res: any = await post(`/ticket/admin/${currentTicket.id}/reply`, {
      adminReply: ticketReply.trim(),
      status: 'replied',
    });
    if (res.success) {
      message.success('工单已回复');
      setTicketReplyModalOpen(false);
      fetchTickets();
      fetchDashboard();
    }
  };

  const openPlanModal = (plan?: PlanItem) => {
    setEditingPlan(plan || null);
    if (plan) {
      planForm.setFieldsValue({
        ...plan,
        features: (plan.features || []).join('\n'),
      });
    } else {
      planForm.resetFields();
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    const values = await planForm.validateFields();
    const payload = {
      ...values,
      features: values.features
        ? values.features
            .split('\n')
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],
    };
    const url = editingPlan ? `/plan/${editingPlan.id}/update` : '/plan/create';
    const res: any = await post(url, payload);
    if (res.success) {
      message.success(editingPlan ? '套餐已更新' : '套餐已创建');
      setPlanModalOpen(false);
      fetchPlans();
    }
  };

  const handleDeletePlan = async (plan: PlanItem) => {
    const res: any = await post(`/plan/${plan.id}/delete`);
    if (res.success) {
      message.success('套餐已删除');
      fetchPlans();
    }
  };

  const handleImportPlans = async (file: File) => {
    const formData = new FormData();
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    formData.append('file', file);
    const res = await fetch(`${basicUrl}/plan/admin/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      message.success('套餐导入完成');
      fetchPlans();
    }
  };

  const openCouponModal = (coupon?: CouponItem) => {
    setEditingCoupon(coupon || null);
    if (coupon) {
      couponForm.setFieldsValue(coupon);
    } else {
      couponForm.resetFields();
    }
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async () => {
    const values = await couponForm.validateFields();
    const url = editingCoupon ? `/coupon/admin/${editingCoupon.id}/update` : '/coupon/admin/create';
    const res: any = await post(url, values);
    if (res.success) {
      message.success(editingCoupon ? '优惠码已更新' : '优惠码已创建');
      setCouponModalOpen(false);
      fetchCoupons();
      fetchDashboard();
    }
  };

  const handleDeleteCoupon = async (coupon: CouponItem) => {
    const res: any = await post(`/coupon/admin/${coupon.id}/delete`);
    if (res.success) {
      message.success('优惠码已删除');
      fetchCoupons();
      fetchDashboard();
    }
  };

  const handleImportCoupons = async (file: File) => {
    const formData = new FormData();
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    formData.append('file', file);
    const res = await fetch(`${basicUrl}/coupon/admin/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      message.success('优惠码导入完成');
      fetchCoupons();
      fetchDashboard();
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

  const handleRunBackup = async () => {
    const res: any = await post('/ops/backup/run');
    if (res.success) {
      message.success('数据库备份成功');
      fetchOpsData();
    }
  };

  const handleExportOrders = async () => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    const response = await fetch(`${basicUrl}/order/admin/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'orders.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReport = async () => {
    const res: any = await post('/ops/report/send?days=1');
    if (res.success) {
      message.success(res.data.sent ? '经营报告已发送' : '报告已生成，但邮件未发出');
      fetchOpsData();
    }
  };

  const orderColumns: ColumnsType<OrderItem> = [
    { title: '订单号', dataIndex: 'orderNo', render: value => <span style={{ fontFamily: 'monospace' }}>{value}</span> },
    { title: '用户', dataIndex: 'username', width: 120 },
    { title: '套餐', dataIndex: 'planName' },
    { title: '金额', render: (_, record) => `¥${record.actualAmount}` },
    {
      title: '状态',
      dataIndex: 'status',
      render: value => {
        const item = orderStatusMap[value] || { color: 'default', label: value };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    { title: '凭证', dataIndex: 'paymentProof', render: value => value || '-' },
    { title: '进度', dataIndex: 'progressNote', render: value => value || '-' },
    { title: '截止时间', dataIndex: 'expireAt', render: value => (value ? new Date(value).toLocaleString() : '-') },
    {
      title: '操作',
      render: (_, record) => (
        <Space wrap>
          {record.status === 'pending' && (
            <Button size="small" type="primary" onClick={() => handleConfirmPaid(record)}>
              确认收款
            </Button>
          )}
          {['paid', 'processing'].includes(record.status) && (
            <Button size="small" onClick={() => handleUpdateOrderStatus(record)}>
              更新状态
            </Button>
          )}
          {['paid', 'processing', 'completed'].includes(record.status) && (
            <Button size="small" danger onClick={() => handleRefund(record)}>
              退款
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<UserItem> = [
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email', render: value => value || '-' },
    { title: '邀请码', dataIndex: 'inviteCode' },
    { title: '返利余额', dataIndex: 'rewardBalance', render: value => `¥${Number(value).toFixed(2)}` },
    {
      title: '订阅到期',
      dataIndex: 'subscriptionExpiresAt',
      render: value => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '状态',
      render: (_, record) => (
        <Space>
          <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? '正常' : '禁用'}</Tag>
          {record.isAdmin && <Tag color="gold">管理员</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<CrownOutlined />} onClick={() => handleToggleAdmin(record)}>
            {record.isAdmin ? '取消管理员' : '设为管理员'}
          </Button>
          <Button
            size="small"
            icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => handleToggleActive(record)}
          >
            {record.isActive ? '禁用' : '启用'}
          </Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>
            重置密码
          </Button>
        </Space>
      ),
    },
  ];

  const ticketColumns: ColumnsType<TicketItem> = [
    { title: '用户', dataIndex: 'username', width: 120 },
    { title: '标题', dataIndex: 'subject', width: 180 },
    { title: '内容', dataIndex: 'content' },
    {
      title: '状态',
      dataIndex: 'status',
      render: value => {
        const item = ticketStatusMap[value] || { color: 'default', label: value };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    { title: '管理员回复', dataIndex: 'adminReply', render: value => value || '-' },
    {
      title: '操作',
      render: (_, record) => (
        <Button size="small" onClick={() => openTicketReplyModal(record)}>
          回复
        </Button>
      ),
    },
  ];

  const planColumns: ColumnsType<PlanItem> = [
    { title: '名称', dataIndex: 'name' },
    { title: '服务商', dataIndex: 'provider', width: 120 },
    { title: '售价', dataIndex: 'price', width: 100, render: value => `¥${value}` },
    {
      title: '状态',
      render: (_, record) => (
        <Space>
          <Tag color={record.isActive ? 'green' : 'default'}>{record.isActive ? '上架' : '下架'}</Tag>
          {record.isHot && <Tag color="volcano">热门</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openPlanModal(record)}>
            编辑
          </Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeletePlan(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const couponColumns: ColumnsType<CouponItem> = [
    { title: '优惠码', dataIndex: 'code' },
    { title: '减免金额', dataIndex: 'discountAmount', render: value => `¥${value}` },
    { title: '使用情况', render: (_, record) => `${record.usedCount}/${record.maxUses}` },
    {
      title: '状态',
      dataIndex: 'isActive',
      render: value => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openCouponModal(record)}>
            编辑
          </Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteCoupon(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="surface-card admin-header">
        <div className="admin-header-pattern" />
        <div className="admin-header-content">
          <div className="admin-header-copy">
            <span className="admin-header-eyebrow">Operations Hub</span>
            <h1>{t('admin')}</h1>
            <p>支付、订单、工单、运营数据与安全运维统一面板，日常运营动作都可以在这里集中完成。</p>
            <div className="admin-header-note">当前活跃页签：{adminTabLabels[activeTab]}</div>
          </div>
          <div className="admin-header-glance">
            {adminHighlights.map(item => (
              <div key={item.key} className={`admin-glance-card tone-${item.tone}`}>
                <div className="admin-glance-icon">{item.icon}</div>
                <span className="admin-glance-label">{item.label}</span>
                <strong className="admin-glance-value">{item.value}</strong>
                <span className="admin-glance-detail">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        className="admin-tabs"
        activeKey={activeTab}
        onChange={key => void handleTabChange(key)}
        items={[
          {
            key: 'dashboard',
            label: (
              <span>
                <DashboardOutlined /> 仪表盘
              </span>
            ),
            children: dashboardLoading ? (
              <div className="admin-loading">
                <Spin size="large" />
              </div>
            ) : (
              <div className="admin-section-stack">
                {overview && (
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                        <TeamOutlined />
                      </div>
                      <div className="stat-card-info">
                        <span className="stat-card-value">{overview.totalUsers}</span>
                        <span className="stat-card-label">总用户</span>
                      </div>
                      <div className="stat-card-extra">今日 +{overview.todayUsers}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                        <FileTextOutlined />
                      </div>
                      <div className="stat-card-info">
                        <span className="stat-card-value">{overview.totalOrders}</span>
                        <span className="stat-card-label">总订单</span>
                      </div>
                      <div className="stat-card-extra">{overview.pendingOrders} 待支付</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon" style={{ background: '#fae8ff', color: '#9333ea' }}>
                        ¥
                      </div>
                      <div className="stat-card-info">
                        <span className="stat-card-value">¥{overview.totalRevenue.toFixed(0)}</span>
                        <span className="stat-card-label">总收入</span>
                      </div>
                      <div className="stat-card-extra">今日 ¥{overview.todayRevenue.toFixed(0)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                        <MessageOutlined />
                      </div>
                      <div className="stat-card-info">
                        <span className="stat-card-value">{overview.openTickets}</span>
                        <span className="stat-card-label">待处理工单</span>
                      </div>
                      <div className="stat-card-extra">{overview.activeSubscriptions} 活跃订阅</div>
                    </div>
                  </div>
                )}

                <div className="dashboard-section-grid">
                  <div className="surface-card dashboard-panel">
                    <h3>留存与复购</h3>
                    <div className="simple-list">
                      {retention.slice(-7).map(item => (
                        <div key={item.date} className="simple-list-row">
                          <span>{item.date}</span>
                          <span>
                            新客 {item.newCustomers} / 复购 {item.retainedCustomers} / {item.retentionRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="surface-card dashboard-panel">
                    <h3>套餐销量排行</h3>
                    <div className="simple-list">
                      {planSales.map(item => (
                        <div key={item.planName} className="simple-list-row">
                          <span>{item.planName}</span>
                          <span>{item.count} 单 / ¥{item.revenue} / {item.revenueShare}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="surface-card dashboard-panel coupon-performance-panel">
                  <h3>优惠码使用统计</h3>
                  <div className="coupon-performance">
                    <div className="coupon-performance-summary">
                      <div className="coupon-performance-stat">
                        <span>活跃优惠码</span>
                        <strong>{couponStats.length}</strong>
                        <small>当前已产生使用记录</small>
                      </div>
                      <div className="coupon-performance-stat">
                        <span>累计使用次数</span>
                        <strong>{totalCouponUses}</strong>
                        <small>覆盖全部已成交订单</small>
                      </div>
                      <div className="coupon-performance-stat">
                        <span>累计贡献收入</span>
                        <strong>{formatCurrency(totalCouponRevenue)}</strong>
                        <small>由优惠码带来的成交金额</small>
                      </div>
                      <div className="coupon-performance-stat highlight">
                        <span>最佳优惠码</span>
                        <strong>{topCoupon?.couponCode || '--'}</strong>
                        <small>
                          {topCoupon
                            ? `${topCoupon.usedCount} 次使用 · ${formatCurrency(topCoupon.revenue)}`
                            : '暂无数据'}
                        </small>
                      </div>
                    </div>

                    <div className="coupon-performance-list">
                      {couponStats.length > 0 ? (
                        couponStats.map((item, index) => {
                          const usagePercent = totalCouponUses
                            ? Math.max((item.usedCount / totalCouponUses) * 100, 8)
                            : 0;
                          const revenueShare = totalCouponRevenue
                            ? ((item.revenue / totalCouponRevenue) * 100).toFixed(1)
                            : '0.0';

                          return (
                            <div key={item.couponCode} className="coupon-performance-item">
                              <div className="coupon-performance-item-head">
                                <div className="coupon-performance-rank">
                                  {index === 0 ? <CrownOutlined /> : `#${String(index + 1).padStart(2, '0')}`}
                                </div>
                                <div className="coupon-performance-meta">
                                  <strong>{item.couponCode}</strong>
                                  <span>
                                    使用 {item.usedCount} 次 · 收入占比 {revenueShare}%
                                  </span>
                                </div>
                                <div className="coupon-performance-amount">
                                  {formatCurrency(item.revenue)}
                                </div>
                              </div>
                              <div className="coupon-performance-bar">
                                <span style={{ width: `${usagePercent}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="coupon-performance-empty">
                          暂无优惠码成交数据，等用户开始使用后会在这里展示排行。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'orders',
            label: (
              <span>
                <FileTextOutlined /> 订单
              </span>
            ),
            children: (
              <div className="admin-section-stack">
                <div className="surface-card admin-toolbar-shell">
                  <div className="admin-filter-bar">
                    <Input placeholder="订单号" value={orderNoFilter} onChange={event => setOrderNoFilter(event.target.value)} />
                    <Input placeholder="用户名" value={orderUsernameFilter} onChange={event => setOrderUsernameFilter(event.target.value)} />
                    <Select
                      allowClear
                      placeholder="订单状态"
                      value={orderStatusFilter}
                      style={{ width: 160 }}
                      onChange={value => setOrderStatusFilter(value)}
                      options={Object.entries(orderStatusMap).map(([value, item]) => ({
                        label: item.label,
                        value,
                      }))}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => void fetchOrders()}>
                      搜索
                    </Button>
                    <Button icon={<SyncOutlined />} onClick={() => void fetchOrders()}>
                      {t('refresh')}
                    </Button>
                    <Button onClick={handleExportOrders}>导出 CSV</Button>
                  </div>
                </div>
                <div className="surface-card admin-table-shell">
                  <div className="admin-table-caption">
                    <div>
                      <strong>订单处理中心</strong>
                      <span>支持确认收款、更新进度、导出报表和退款处理。</span>
                    </div>
                    <span className="admin-caption-tag">共 {orders.length} 笔</span>
                  </div>
                  <Table
                    rowKey="id"
                    loading={ordersLoading}
                    columns={orderColumns}
                    dataSource={orders}
                    className="admin-table"
                    scroll={{ x: 1200 }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> 用户
              </span>
            ),
            children: (
              <div className="admin-section-stack">
                <div className="surface-card admin-toolbar-shell">
                  <div className="admin-filter-bar">
                    <Input placeholder="搜索用户名" value={userKeyword} onChange={event => setUserKeyword(event.target.value)} />
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => void fetchUsers()}>
                      搜索
                    </Button>
                    <Button icon={<SyncOutlined />} onClick={() => void fetchUsers()}>
                      {t('refresh')}
                    </Button>
                  </div>
                </div>
                <div className="surface-card admin-table-shell">
                  <div className="admin-table-caption">
                    <div>
                      <strong>用户与权限</strong>
                      <span>集中管理用户状态、管理员权限、返利余额与密码重置。</span>
                    </div>
                    <span className="admin-caption-tag">共 {users.length} 位</span>
                  </div>
                  <Table
                    rowKey="id"
                    loading={usersLoading}
                    columns={userColumns}
                    dataSource={users}
                    className="admin-table"
                    scroll={{ x: 1200 }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'tickets',
            label: (
              <span>
                <MessageOutlined /> 工单
              </span>
            ),
            children: (
              <div className="surface-card admin-table-shell">
                <div className="admin-table-caption">
                  <div>
                    <strong>工单回复中心</strong>
                    <span>统一查看用户问题、跟进状态并直接完成回复。</span>
                  </div>
                  <span className="admin-caption-tag">待处理 {tickets.filter(item => item.status === 'open').length}</span>
                </div>
                <Table
                  rowKey="id"
                  loading={ticketsLoading}
                  columns={ticketColumns}
                  dataSource={tickets}
                  className="admin-table"
                  scroll={{ x: 1000 }}
                />
              </div>
            ),
          },
          {
            key: 'plans',
            label: (
              <span>
                <AppstoreOutlined /> 套餐
              </span>
            ),
            children: (
              <div className="admin-section-stack">
                <div className="surface-card admin-toolbar-shell">
                  <div className="admin-filter-bar">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlanModal()}>
                      新建套餐
                    </Button>
                    <Upload
                      accept=".json"
                      showUploadList={false}
                      beforeUpload={file => {
                        void handleImportPlans(file);
                        return false;
                      }}
                    >
                      <Button icon={<ImportOutlined />}>导入 JSON</Button>
                    </Upload>
                    <Button icon={<SyncOutlined />} onClick={() => void fetchPlans()}>
                      {t('refresh')}
                    </Button>
                  </div>
                </div>
                <div className="surface-card admin-table-shell">
                  <div className="admin-table-caption">
                    <div>
                      <strong>套餐配置</strong>
                      <span>维护套餐价格、时长、特性与上下架状态。</span>
                    </div>
                    <span className="admin-caption-tag">共 {plans.length} 个</span>
                  </div>
                  <Table rowKey="id" loading={plansLoading} columns={planColumns} dataSource={plans} className="admin-table" />
                </div>
              </div>
            ),
          },
          {
            key: 'coupons',
            label: (
              <span>
                <GiftOutlined /> 优惠码
              </span>
            ),
            children: (
              <div className="admin-section-stack">
                <div className="surface-card admin-toolbar-shell">
                  <div className="admin-filter-bar">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCouponModal()}>
                      新建优惠码
                    </Button>
                    <Upload
                      accept=".json"
                      showUploadList={false}
                      beforeUpload={file => {
                        void handleImportCoupons(file);
                        return false;
                      }}
                    >
                      <Button icon={<ImportOutlined />}>导入 JSON</Button>
                    </Upload>
                    <Button icon={<SyncOutlined />} onClick={() => void fetchCoupons()}>
                      {t('refresh')}
                    </Button>
                  </div>
                </div>
                <div className="surface-card admin-table-shell">
                  <div className="admin-table-caption">
                    <div>
                      <strong>优惠码仓库</strong>
                      <span>统一管理减免金额、使用上限和启停状态。</span>
                    </div>
                    <span className="admin-caption-tag">共 {coupons.length} 个</span>
                  </div>
                  <Table rowKey="id" loading={couponsLoading} columns={couponColumns} dataSource={coupons} className="admin-table" />
                </div>
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
            children: settingsLoading ? (
              <div className="admin-loading">
                <Spin size="large" />
              </div>
            ) : (
              <div className="surface-card settings-shell">
                <div className="admin-table-caption">
                  <div>
                    <strong>站点设置</strong>
                    <span>集中维护公开地址、邮件配置、支付说明等全局参数。</span>
                  </div>
                  <span className="admin-caption-tag">共 {settings.length} 项</span>
                </div>
                <div className="settings-list">
                  {settings.map(item => (
                    <div key={item.key} className="setting-item">
                      <div className="setting-label">
                        <strong>{item.description}</strong>
                        <span className="setting-key">{item.key}</span>
                      </div>
                      <Input
                        className="settings-input"
                        value={settingsEditing[item.key]}
                        onChange={event =>
                          setSettingsEditing(prev => ({ ...prev, [item.key]: event.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="settings-actions">
                  <Button type="primary" onClick={handleSaveSettings}>
                    {t('save')}
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: 'ops',
            label: (
              <span>
                <CloudServerOutlined /> {t('systemOps')}
              </span>
            ),
            children: opsLoading ? (
              <div className="admin-loading">
                <Spin size="large" />
              </div>
            ) : (
              <div className="dashboard-section-grid admin-ops-grid">
                <div className="surface-card dashboard-panel">
                  <div className="admin-panel-header">
                    <div>
                      <h3>健康检查</h3>
                      <p>CPU、内存、磁盘、运行时长与数据库状态</p>
                    </div>
                    <Button icon={<SyncOutlined />} onClick={() => void fetchOpsData()}>
                      {t('refresh')}
                    </Button>
                  </div>
                  {health && (
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="服务时间">{new Date(health.serverTime).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="启动时间">{new Date(health.startedAt).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="CPU 1m">{health.cpuLoad.load1m}</Descriptions.Item>
                      <Descriptions.Item label="内存占用">{health.memory.usagePercent}%</Descriptions.Item>
                      <Descriptions.Item label="磁盘占用">{health.disk.usagePercent}%</Descriptions.Item>
                      <Descriptions.Item label="订单数">{String(health.database.orders)}</Descriptions.Item>
                    </Descriptions>
                  )}
                </div>

                <div className="surface-card dashboard-panel">
                  <div className="admin-panel-header">
                    <div>
                      <h3>数据备份</h3>
                      <p>支持 SQLite 自动备份到本地/NAS 挂载目录</p>
                    </div>
                    <Button type="primary" onClick={handleRunBackup}>
                      立即备份
                    </Button>
                  </div>
                  <div className="simple-list">
                    {backupItems.map(item => (
                      <div key={item.name} className="simple-list-row">
                        <span>{item.name}</span>
                        <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-card dashboard-panel full-width">
                  <div className="admin-panel-header">
                    <div>
                      <h3>定时报表</h3>
                      <p>支持每日/每周邮件发送，也可手动预览与发送</p>
                    </div>
                    <Button type="primary" onClick={handleSendReport}>
                      发送今日报告
                    </Button>
                  </div>
                  {reportPreview && (
                    <Descriptions column={2}>
                      <Descriptions.Item label="生成时间">{new Date(reportPreview.generatedAt).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="新增用户">{reportPreview.newUsers}</Descriptions.Item>
                      <Descriptions.Item label="新增订单">{reportPreview.newOrders}</Descriptions.Item>
                      <Descriptions.Item label="确认订单">{reportPreview.confirmedOrders}</Descriptions.Item>
                      <Descriptions.Item label="新增收入">¥{reportPreview.newRevenue}</Descriptions.Item>
                      <Descriptions.Item label="退款金额">¥{reportPreview.refundAmount}</Descriptions.Item>
                    </Descriptions>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal title={editingPlan ? '编辑套餐' : '新建套餐'} open={planModalOpen} onOk={handleSavePlan} onCancel={() => setPlanModalOpen(false)} width={560}>
        <Form form={planForm} layout="vertical" initialValues={{ durationDays: 30, sortOrder: 0, isActive: true, isHot: false }}>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="provider" label="服务商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="price" label="售价" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="originalPrice" label="原价">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="durationDays" label="有效天数">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="features" label="功能特性">
            <Input.TextArea rows={4} placeholder="每行一个特性" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="isActive" label="上架" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isHot" label="热门" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title={editingCoupon ? '编辑优惠码' : '新建优惠码'} open={couponModalOpen} onOk={handleSaveCoupon} onCancel={() => setCouponModalOpen(false)} width={460}>
        <Form form={couponForm} layout="vertical" initialValues={{ maxUses: 1, isActive: true }}>
          <Form.Item name="code" label="优惠码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="discountAmount" label="减免金额" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxUses" label="最大使用次数" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="isActive" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="回复工单" open={ticketReplyModalOpen} onOk={handleReplyTicket} onCancel={() => setTicketReplyModalOpen(false)}>
        <Input.TextArea rows={5} value={ticketReply} onChange={event => setTicketReply(event.target.value)} placeholder="请输入回复内容" />
      </Modal>
    </div>
  );
};

export default AdminPage;
