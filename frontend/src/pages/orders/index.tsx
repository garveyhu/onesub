import { SyncOutlined } from '@ant-design/icons';
import { App, Button, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import alipayQR from '@/assets/images/alipay-links.jpg';
import wechatQR from '@/assets/images/wechat-links.jpg';
import { AUTH_CONFIG } from '@/constants/app.constants';
import { get, post } from '@/services';

import './index.less';

interface OrderItem {
  id: number;
  orderNo: string;
  planName: string;
  amount: number;
  couponCode: string | null;
  discountAmount: number;
  actualAmount: number;
  status: string;
  createdAt: string;
  adminRemark: string | null;
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待确认' },
  paid: { color: 'blue', label: '已确认收款' },
  processing: { color: 'cyan', label: '开通中' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      content: `确定要取消订单 ${order.orderNo} 吗？取消后优惠码将退还。`,
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

  const showPayQR = (order: OrderItem) => {
    modal.info({
      title: '扫码支付',
      icon: null,
      width: 400,
      centered: true,
      content: (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#ef4444' }}>
            请转账 ¥{order.actualAmount}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>支付宝扫码转账</p>
              <div style={{
                display: 'inline-block',
                padding: 8,
                background: '#fff',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
              }}>
                <img
                  src={alipayQR}
                  alt="支付宝收款码"
                  style={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 8 }}
                />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>微信联系客服</p>
              <div style={{
                display: 'inline-block',
                padding: 8,
                background: '#fff',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
              }}>
                <img
                  src={wechatQR}
                  alt="微信客服"
                  style={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 8 }}
                />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 12 }}>
            转账后添加微信发送订单号，客服 5 分钟内确认开通
          </p>
        </div>
      ),
      okText: '已知晓',
    });
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{text}</span>,
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
          <span style={{ fontWeight: 600 }}>¥{record.actualAmount}</span>
          {record.discountAmount > 0 && (
            <Tag color="green" style={{ marginLeft: 6, fontSize: 11 }}>
              优惠 ¥{record.discountAmount}
            </Tag>
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
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => showPayQR(record)}>
                查看收款码
              </Button>
              <Button type="link" danger size="small" onClick={() => handleCancel(record)}>
                取消
              </Button>
            </>
          )}
          {record.adminRemark && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>备注: {record.adminRemark}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>我的订单</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button icon={<SyncOutlined />} onClick={fetchOrders} loading={loading}>
            刷新
          </Button>
          <Button type="primary" onClick={() => navigate('/plans')}>
            购买套餐
          </Button>
        </div>
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
