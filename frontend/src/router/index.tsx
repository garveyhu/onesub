import { lazy } from 'react';

import type { RouteConfig } from '@/types/router';

const routes: RouteConfig[] = [
  {
    path: '/',
    component: lazy(() => import('@/components/layout/MainLayout')),
    children: [
      {
        index: true,
        component: lazy(() => import('@/pages/home')),
        meta: {
          title: 'OneSub - AI 订阅代充平台',
          description:
            'OneSub 提供 ChatGPT、Claude、Gemini 等 AI 订阅代充服务，支持支付宝/微信支付、优惠码、工单客服与邀请返利。',
          canonicalPath: '/',
        },
      },
      {
        path: '/home',
        component: lazy(() => import('@/pages/home')),
        redirect: '/',
      },
      {
        path: '/plans',
        component: lazy(() => import('@/pages/plans')),
        meta: {
          title: 'AI 订阅套餐 - OneSub',
          description:
            '查看 OneSub 提供的 ChatGPT、Claude、Gemini 等 AI 订阅套餐，支持多种时长、优惠码与快速开通。',
          canonicalPath: '/plans',
        },
      },
      {
        path: '/orders',
        component: lazy(() => import('@/pages/orders')),
        meta: { title: '我的订单 - OneSub', auth: true, noindex: true },
      },
      {
        path: '/orders/:orderId',
        component: lazy(() => import('@/pages/order-detail')),
        meta: { title: '订单详情 - OneSub', auth: true, noindex: true },
      },
      {
        path: '/profile',
        component: lazy(() => import('@/pages/profile')),
        meta: { title: '个人中心 - OneSub', auth: true, noindex: true },
      },
      {
        path: '/admin',
        component: lazy(() => import('@/pages/admin')),
        meta: { title: '管理后台 - OneSub', auth: true, noindex: true },
      },
    ],
  },
  {
    path: '/login',
    component: lazy(() => import('@/pages/login')),
    meta: {
      auth: false,
      forbidRepeatLogin: true,
      title: '登录 - OneSub',
      description: '登录 OneSub，管理 AI 订阅订单、邀请返利、工单和账户资料。',
      canonicalPath: '/login',
      noindex: true,
    },
  },
  {
    path: '*',
    component: lazy(() => import('@/pages/404')),
    meta: { title: '404 - OneSub', auth: false, noindex: true },
  },
];

export default routes;
