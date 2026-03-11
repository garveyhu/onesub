import { App, Button, Input, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { get, post } from '@/services';

import './index.less';

interface OrderItem {
  id: number;
  orderNo: string;
  userId: number;
  planName: string;
  amount: number;
  couponCode: string | null;
  discountAmount: number;
  actualAmount: number;
  status: string;
  adminRemark: string | null;
  createdAt: string;
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  paid: { color: 'blue', label: '已确认收款' },
  processing: { color: 'purple', label: '开通中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'default', label: '已取消' },
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchOrders = async () => {
    try {
      const res: any = await get('/order/admin/list');
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPaid = (order: OrderItem) => {
    let remark = '';
    modal.confirm({
      title: `确认收款 — ${order.orderNo}`,
      content: (
        <div>
          <p>套餐: {order.planName} | 实付: ¥{order.actualAmount}</p>
          <Input.TextArea
            placeholder="管理员备注（选填）"
            onChange={(e) => (remark = e.target.value)}
            rows={2}
          />
        </div>
      ),
      onOk: async () => {
        const res: any = await post(`/order/admin/${order.id}/confirm`, { adminRemark: remark || undefined });
        if (res.success) {
          message.success('已确认收款');
          fetchOrders();
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
          fetchOrders();
        }
      },
    });
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
      width: 200,
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
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

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>订单管理</h1>
        <Button onClick={fetchOrders}>刷新</Button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          className="admin-table"
          scroll={{ x: 1000 }}
        />
      )}
    </div>
  );
};

export default AdminPage;
