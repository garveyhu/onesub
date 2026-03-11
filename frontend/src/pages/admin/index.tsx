import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FireOutlined,
  GiftOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { get, post } from '@/services';

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
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  // ---- Orders ----
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderUsername, setOrderUsername] = useState('');
  const [orderStatus, setOrderStatus] = useState<string | undefined>(undefined);

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
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ==================== ORDERS ====================

  const fetchOrders = async (username?: string, status?: string) => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (username) params.set('username', username);
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
    fetchOrders(orderUsername || undefined, orderStatus);
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
            onChange={(e) => (remark = e.target.value)}
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
            ]}
            onChange={(v) => (newStatus = v)}
            style={{ width: '100%' }}
          />
          <Input.TextArea
            placeholder="管理员备注（选填）"
            onChange={(e) => (remark = e.target.value)}
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
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
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
      render: (text) => new Date(text).toLocaleString('zh-CN'),
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

  const planColumns: ColumnsType<PlanItem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name' },
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
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '减免',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      render: (v) => `¥${v}`,
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
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
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
      key: 'orders',
      label: <span><FileTextOutlined /> 订单管理</span>,
      children: (
        <div>
          <div className="admin-filter-bar">
            <Input
              placeholder="搜索用户名"
              prefix={<SearchOutlined />}
              value={orderUsername}
              onChange={(e) => setOrderUsername(e.target.value)}
              onPressEnter={handleOrderSearch}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="订单状态"
              value={orderStatus}
              onChange={(v) => setOrderStatus(v)}
              allowClear
              style={{ width: 140 }}
              options={Object.entries(statusMap).map(([k, v]) => ({ label: v.label, value: k }))}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleOrderSearch}>
              搜索
            </Button>
            <Button icon={<SyncOutlined />} onClick={() => fetchOrders()}>
              刷新
            </Button>
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
            />
          )}
        </div>
      ),
    },
    {
      key: 'plans',
      label: <span><AppstoreOutlined /> 套餐管理</span>,
      children: (
        <div>
          <div className="admin-filter-bar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlanModal()}>
              新建套餐
            </Button>
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
      label: <span><GiftOutlined /> 优惠码管理</span>,
      children: (
        <div>
          <div className="admin-filter-bar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCouponModal()}>
              新建优惠码
            </Button>
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
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>管理后台</h1>
      </div>

      <Tabs
        defaultActiveKey="orders"
        items={tabItems}
        onChange={(key) => {
          if (key === 'orders') fetchOrders();
          else if (key === 'plans') fetchPlans();
          else if (key === 'coupons') fetchCoupons();
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
        <Form form={planForm} layout="vertical" initialValues={{ durationDays: 30, sortOrder: 0, isActive: true, isHot: false }}>
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
            <Input.TextArea rows={4} placeholder="每行一个特性，例如：&#10;Claude Opus 4.6 解锁使用&#10;200K 超长上下文" />
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
            <Input placeholder="例如：WELCOME20" />
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
    </div>
  );
};

export default AdminPage;
