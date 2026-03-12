import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Descriptions, Spin, Tag, Timeline } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { get } from '@/services';

import './index.less';

interface OrderDetailItem {
  id: number;
  orderNo: string;
  planName: string;
  paymentMethod: string;
  actualAmount: number;
  discountAmount: number;
  couponCode: string | null;
  status: string;
  createdAt: string;
  expireAt: string | null;
  paidAt: string | null;
  completedAt: string | null;
  progressNote: string | null;
  paymentProof: string | null;
  refundStatus: string;
  refundReason: string | null;
  refundAmount: number;
  refundedAt: string | null;
  adminRemark: string | null;
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待支付' },
  paid: { color: 'blue', label: '已付款' },
  processing: { color: 'cyan', label: '开通中' },
  completed: { color: 'green', label: '已完成' },
  refunded: { color: 'purple', label: '已退款' },
  cancelled: { color: 'default', label: '已取消' },
};

const OrderDetailPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { orderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetailItem | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const res: any = await get(`/order/${orderId}`);
        if (res.success) {
          setOrder(res.data);
        }
      } catch {
        message.error('订单详情加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [message, orderId]);

  if (loading) {
    return (
      <div className="order-detail-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const timelineItems = [
    { children: `订单创建：${new Date(order.createdAt).toLocaleString()}` },
    order.paidAt ? { color: 'blue', children: `支付确认：${new Date(order.paidAt).toLocaleString()}` } : null,
    order.completedAt
      ? { color: 'green', children: `开通完成：${new Date(order.completedAt).toLocaleString()}` }
      : null,
    order.refundedAt
      ? {
          color: 'purple',
          children: `退款完成：${new Date(order.refundedAt).toLocaleString()} / ¥${order.refundAmount}`,
        }
      : null,
  ].filter(Boolean);

  const statusItem = statusMap[order.status] || { color: 'default', label: order.status };

  return (
    <div className="order-detail-page">
      <div className="order-detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
          返回订单列表
        </Button>
        <Tag color={statusItem.color}>{statusItem.label}</Tag>
      </div>

      <div className="surface-card order-detail-card">
        <h1>订单详情</h1>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
          <Descriptions.Item label="套餐">{order.planName}</Descriptions.Item>
          <Descriptions.Item label="支付方式">{order.paymentMethod}</Descriptions.Item>
          <Descriptions.Item label="实付金额">¥{order.actualAmount}</Descriptions.Item>
          <Descriptions.Item label="优惠信息">
            {order.discountAmount > 0 ? `¥${order.discountAmount} / ${order.couponCode}` : '无'}
          </Descriptions.Item>
          <Descriptions.Item label="支付截止">
            {order.expireAt ? new Date(order.expireAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="支付凭证">{order.paymentProof || '未提交'}</Descriptions.Item>
          <Descriptions.Item label="开通进度">{order.progressNote || '等待处理'}</Descriptions.Item>
          <Descriptions.Item label="管理员备注">{order.adminRemark || '无'}</Descriptions.Item>
          <Descriptions.Item label="退款状态">
            {order.refundStatus === 'refunded'
              ? `已退款 ¥${order.refundAmount}${order.refundReason ? ` / ${order.refundReason}` : ''}`
              : '未退款'}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div className="surface-card order-detail-card">
        <h2>订单时间线</h2>
        <Timeline items={timelineItems as any} />
      </div>
    </div>
  );
};

export default OrderDetailPage;
