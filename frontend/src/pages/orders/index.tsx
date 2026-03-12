import {
  ClockCircleOutlined,
  CreditCardOutlined,
  RocketOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { App, Button, Empty, Input, Modal, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import alipayQR from '@/assets/images/alipay-links.jpg';
import wechatQR from '@/assets/images/wechat-links.jpg';
import { AUTH_CONFIG } from '@/constants/app.constants';
import { useAppPreferences } from '@/contexts/app-preferences';
import { get, post } from '@/services';

import './index.less';

interface OrderItem {
  id: number;
  orderNo: string;
  planName: string;
  actualAmount: number;
  discountAmount: number;
  couponCode: string | null;
  status: string;
  createdAt: string;
  expireAt: string | null;
  progressNote: string | null;
  paymentProof: string | null;
  refundStatus: string;
  refundAmount: number;
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

/**
 * 统一格式化金额，避免订单概览和表格展示风格不一致。
 */
function formatOrderAmount(value: number): string {
  return `¥${value.toFixed(2)}`;
}

/**
 * 统一格式化订单时间，空值时返回占位符。
 */
function formatOrderTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '--';
}

const OrdersPage = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { t } = useAppPreferences();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofText, setProofText] = useState('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem | null>(null);
  const pendingCount = orders.filter(order => order.status === 'pending').length;
  const serviceCount = orders.filter(order => ['paid', 'processing', 'completed'].includes(order.status)).length;
  const totalSpent = orders
    .filter(order => !['cancelled'].includes(order.status))
    .reduce((sum, order) => sum + order.actualAmount, 0);
  const refundedAmount = orders.reduce((sum, order) => {
    return order.refundStatus === 'refunded' ? sum + order.refundAmount : sum;
  }, 0);
  const latestOrderTime = orders.reduce<string | null>((latest, order) => {
    if (!latest) {
      return order.createdAt;
    }
    return new Date(order.createdAt).getTime() > new Date(latest).getTime() ? order.createdAt : latest;
  }, null);
  const overviewCards = [
    {
      key: 'total',
      label: '全部订单',
      value: `${orders.length}`,
      detail: orders.length > 0 ? `最近一笔 ${formatOrderTime(latestOrderTime)}` : '还没有购买记录',
      icon: <CreditCardOutlined />,
      tone: 'sky',
    },
    {
      key: 'pending',
      label: '待支付',
      value: `${pendingCount}`,
      detail: pendingCount > 0 ? '可继续支付或提交凭证' : '当前没有待支付订单',
      icon: <ClockCircleOutlined />,
      tone: 'amber',
    },
    {
      key: 'service',
      label: '开通进度',
      value: `${serviceCount}`,
      detail: serviceCount > 0 ? '已付款、开通中与已完成订单' : '新的订单会在这里同步进度',
      icon: <RocketOutlined />,
      tone: 'teal',
    },
    {
      key: 'amount',
      label: '累计消费',
      value: formatOrderAmount(totalSpent),
      detail: refundedAmount > 0 ? `已退款 ${formatOrderAmount(refundedAmount)}` : '退款金额将自动汇总',
      icon: <WalletOutlined />,
      tone: 'violet',
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY);
    if (!token) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [navigate]);

  /**
   * 拉取当前用户订单列表，并在列表层展示超时、退款和进度信息。
   */
  const fetchOrders = async () => {
    setLoading(true);
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
      title: '确认取消订单',
      content: `订单 ${order.orderNo} 取消后会释放优惠码占用，是否继续？`,
      onOk: async () => {
        const res: any = await post(`/order/${order.id}/cancel`);
        if (res.success) {
          message.success('订单已取消');
          fetchOrders();
        }
      },
    });
  };

  const showPayGuide = (order: OrderItem) => {
    modal.info({
      title: '支付指引',
      icon: null,
      width: 440,
      centered: true,
      content: (
        <div className="pay-guide">
          <p>请先完成转账，再提交订单支付凭证或等待支付回调。</p>
          <div className="pay-guide-grid">
            <div className="pay-guide-card">
              <p>支付宝</p>
              <img src={alipayQR} alt="支付宝收款码" />
            </div>
            <div className="pay-guide-card">
              <p>微信客服</p>
              <img src={wechatQR} alt="微信客服" />
            </div>
          </div>
          <p className="pay-guide-amount">当前应付：¥{order.actualAmount}</p>
        </div>
      ),
      okText: '知道了',
    });
  };

  const openProofModal = (order: OrderItem) => {
    setCurrentOrder(order);
    setProofText(order.paymentProof || '');
    setProofModalOpen(true);
  };

  const handleSubmitProof = async () => {
    if (!currentOrder || !proofText.trim()) {
      message.warning('请填写支付凭证');
      return;
    }
    const res: any = await post(`/order/${currentOrder.id}/proof`, {
      paymentProof: proofText.trim(),
    });
    if (res.success) {
      message.success('支付凭证已提交');
      setProofModalOpen(false);
      fetchOrders();
    }
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: value => <span className="order-no">{value}</span>,
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
        <div className="order-amount-cell">
          <div className="order-amount-current">{formatOrderAmount(record.actualAmount)}</div>
          {record.discountAmount > 0 && (
            <div className="order-amount-discount">
              优惠 {formatOrderAmount(record.discountAmount)} / {record.couponCode}
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
        const item = statusMap[status] || { color: 'default', label: status };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '进度',
      key: 'progressNote',
      render: (_, record) => (
        <div className="order-progress-cell">
          <span>{record.progressNote || '等待处理'}</span>
          {record.refundStatus === 'refunded' && (
            <span className="refund-hint">已退款 ¥{record.refundAmount}</span>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: value => formatOrderTime(value),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className="order-actions">
          <Button type="link" size="small" onClick={() => navigate(`/orders/${record.id}`)}>
            {t('orderDetail')}
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" size="small" onClick={() => showPayGuide(record)}>
                查看支付
              </Button>
              <Button type="link" size="small" onClick={() => openProofModal(record)}>
                提交凭证
              </Button>
              <Button type="link" danger size="small" onClick={() => handleCancel(record)}>
                取消
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="orders-page">
      <div className="surface-card orders-hero">
        <div className="orders-hero-pattern" />
        <div className="orders-hero-content">
          <div className="orders-hero-copy">
            <span className="orders-hero-eyebrow">Order Center</span>
            <div className="orders-header">
              <div>
                <h1>{t('orders')}</h1>
                <p>查看订单详情、支付凭证、退款状态和开通进度，所有关键动作都集中在这里。</p>
              </div>
            </div>
            <div className="orders-hero-note">
              {latestOrderTime ? `最近更新：${formatOrderTime(latestOrderTime)}` : '还没有订单记录，先去挑选一个套餐吧'}
            </div>
          </div>
          <div className="orders-hero-actions">
            <Button icon={<SyncOutlined />} onClick={fetchOrders} loading={loading}>
              {t('refresh')}
            </Button>
            <Button type="primary" onClick={() => navigate('/plans')}>
              {t('buyNow')}
            </Button>
          </div>
        </div>
        <div className="orders-overview-grid">
          {overviewCards.map(card => (
            <div key={card.key} className={`orders-overview-card tone-${card.tone}`}>
              <div className="orders-overview-icon">{card.icon}</div>
              <span className="orders-overview-label">{card.label}</span>
              <strong className="orders-overview-value">{card.value}</strong>
              <span className="orders-overview-detail">{card.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card orders-table-shell">
        <div className="orders-table-toolbar">
          <div>
            <strong>订单总览</strong>
            <p>共 {orders.length} 笔订单，可直接查看支付、凭证和开通进度。</p>
          </div>
        </div>
        <div className="orders-toolbar-meta">
          <span className="orders-toolbar-chip">待支付 {pendingCount}</span>
          <span className="orders-toolbar-chip">已退款 {formatOrderAmount(refundedAmount)}</span>
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
            scroll={{ x: 920 }}
          />
        ) : (
          <Empty description="暂无订单" className="orders-empty">
            <Button type="primary" onClick={() => navigate('/plans')}>
              {t('buyNow')}
            </Button>
          </Empty>
        )}
      </div>

      <Modal
        title="提交支付凭证"
        open={proofModalOpen}
        onOk={handleSubmitProof}
        onCancel={() => setProofModalOpen(false)}
      >
        <Input.TextArea
          rows={4}
          placeholder="填写支付宝订单号、转账备注或截图链接"
          value={proofText}
          onChange={event => setProofText(event.target.value)}
        />
      </Modal>
    </div>
  );
};

export default OrdersPage;
