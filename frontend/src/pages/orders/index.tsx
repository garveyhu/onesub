import { App, Button, Empty, Spin, Table, Tag } from 'antd';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ColumnsType } from 'antd/es/table';

import { AUTH_CONFIG } from '@/constants/app.constants';
import { get, post } from '@/services';

import './index.less';

interface OrderItem {
  id: number;
  orderNo: string;
  planName: string;
  amount: number;
  status: string;
  createdAt: string;
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待支付' },
  paid: { color: 'blue', label: '已支付' },
  processing: { color: 'purple', label: '开通中' },
  completed: { color: 'green', label: '已完成' },
  cancelled: { color: 'default', label: '已取消' },
};

const OrdersPage = () => {
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
    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const res: any = await get('/order');
      if (res.success) {
        setOrders(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (order: OrderItem) => {
    modal.confirm({
      title: '确认取消',
      content: `确定要取消订单 ${order.orderNo} 吗？`,
      onOk: async () => {
        try {
          const res: any = await post(`/order/${order.id}/cancel`);
          if (res.success) {
            message.success('订单已取消');
            fetchOrders();
          }
        } catch {
          message.error('取消失败');
        }
      },
    });
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: text => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{text}</span>,
    },
    {
      title: '套餐',
      dataIndex: 'planName',
      key: 'planName',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: amount => <span style={{ fontWeight: 600 }}>¥{amount}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status] || { color: 'default', label: status };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: text => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          {record.status === 'pending' && (
            <Button type="link" danger size="small" onClick={() => handleCancel(record)}>
              取消订单
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>我的订单</h1>
        <Button type="primary" onClick={() => navigate('/plans')}>
          购买套餐
        </Button>
      </div>

      {loading ? (
        <div className="orders-loading">
          <Spin size="large" />
        </div>
      ) : orders.length > 0 ? (
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className="orders-table"
        />
      ) : (
        <Empty description="暂无订单" className="orders-empty">
          <Button type="primary" onClick={() => navigate('/plans')}>
            去选购套餐
          </Button>
        </Empty>
      )}
    </div>
  );
};

export default OrdersPage;
