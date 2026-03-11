import { lazy } from 'react';

import type { RouteConfig } from '@/types/router';

const routes: RouteConfig[] = [
  {
    path: '/',
    component: lazy(() => import('@/components/layout/MainLayout')),
    children: [
      {
        index: true,
        redirect: '/home',
        component: lazy(() => import('@/pages/home')),
      },
      {
        path: '/home',
        component: lazy(() => import('@/pages/home')),
        meta: { title: '首页 - OneSub' },
      },
      {
        path: '/plans',
        component: lazy(() => import('@/pages/plans')),
        meta: { title: '套餐 - OneSub' },
      },
      {
        path: '/orders',
        component: lazy(() => import('@/pages/orders')),
        meta: { title: '我的订单 - OneSub', auth: true },
      },
      {
        path: '/profile',
        component: lazy(() => import('@/pages/profile')),
        meta: { title: '个人中心 - OneSub', auth: true },
      },
    ],
  },
  {
    path: '/login',
    component: lazy(() => import('@/pages/login')),
    meta: { auth: false, forbidRepeatLogin: true, title: '登录 - OneSub' },
  },
  {
    path: '*',
    component: lazy(() => import('@/pages/404')),
    meta: { title: '404', auth: false },
  },
];

export default routes;
