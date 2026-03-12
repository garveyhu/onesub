import React from 'react';
import { Navigate, type RouteObject, useLocation } from 'react-router-dom';

import { AUTH_CONFIG } from '@/constants/app.constants';
import type { RouteConfig, RouteMeta } from '@/types/router';

import routes from './index';

const SITE_URL = 'https://sub.kerwin.cloud';
const DEFAULT_META = {
  title: 'OneSub - AI 订阅服务',
  description:
    'OneSub 提供 ChatGPT、Claude、Gemini 等 AI 服务订阅下单、支付、返利、工单和后台运营管理。',
  canonicalPath: '/',
};

export function init(): RouteObject[] {
  return transformRoutes(routes);
}

function transformRoutes(list: RouteConfig[]): RouteObject[] {
  return list.map(item => {
    const route: Partial<RouteObject> = {};

    if (item.redirect) {
      route.element = <Navigate to={item.redirect} replace />;
    } else {
      route.element = <RouteWrapper component={item.component} meta={item.meta} />;
    }

    if (item.index) {
      route.index = true;
    } else if (item.path) {
      route.path = item.path;
    }

    if (item.children) {
      route.children = transformRoutes(item.children);
    }

    return route;
  }) as RouteObject[];
}

interface RouteWrapperProps {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  meta?: RouteMeta;
}

/**
 * 确保页面 head 中存在目标标签，避免每次路由切换重复创建节点。
 */
function ensureHeadTag(
  selector: string,
  creator: () => HTMLElement,
): HTMLElement {
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (existing) {
    return existing;
  }
  const element = creator();
  document.head.appendChild(element);
  return element;
}

/**
 * 将路由 meta 同步到 title、description、canonical、OG 与 robots 标签。
 */
function applyRouteMeta(meta: RouteMeta | undefined, pathname: string): void {
  const title = meta?.title || DEFAULT_META.title;
  const description = meta?.description || DEFAULT_META.description;
  const canonicalPath = meta?.canonicalPath || pathname || DEFAULT_META.canonicalPath;
  const canonicalUrl = new URL(canonicalPath, SITE_URL).toString();
  const robotsContent = meta?.noindex ? 'noindex, nofollow' : 'index, follow';

  document.title = title;

  const descriptionTag = ensureHeadTag('meta[name="description"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('name', 'description');
    return element;
  });
  descriptionTag.setAttribute('content', description);

  const robotsTag = ensureHeadTag('meta[name="robots"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('name', 'robots');
    return element;
  });
  robotsTag.setAttribute('content', robotsContent);

  const canonicalTag = ensureHeadTag('link[rel="canonical"]', () => {
    const element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    return element;
  });
  canonicalTag.setAttribute('href', canonicalUrl);

  const ogTitleTag = ensureHeadTag('meta[property="og:title"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('property', 'og:title');
    return element;
  });
  ogTitleTag.setAttribute('content', title);

  const ogDescriptionTag = ensureHeadTag('meta[property="og:description"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('property', 'og:description');
    return element;
  });
  ogDescriptionTag.setAttribute('content', description);

  const ogUrlTag = ensureHeadTag('meta[property="og:url"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('property', 'og:url');
    return element;
  });
  ogUrlTag.setAttribute('content', canonicalUrl);

  const twitterTitleTag = ensureHeadTag('meta[name="twitter:title"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('name', 'twitter:title');
    return element;
  });
  twitterTitleTag.setAttribute('content', title);

  const twitterDescriptionTag = ensureHeadTag('meta[name="twitter:description"]', () => {
    const element = document.createElement('meta');
    element.setAttribute('name', 'twitter:description');
    return element;
  });
  twitterDescriptionTag.setAttribute('content', description);
}

const RouteWrapper: React.FC<RouteWrapperProps> = ({ component: Component, meta }) => {
  const location = useLocation();

  React.useEffect(() => {
    applyRouteMeta(meta, location.pathname);
  }, [location.pathname, meta]);

  // 认证校验
  if (meta?.auth && !isAuthenticated()) {
    return <Navigate to={AUTH_CONFIG.LOGIN_REDIRECT} replace />;
  }
  if (meta?.forbidRepeatLogin && isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <Component />;
};

function isAuthenticated(): boolean {
  return (
    !!sessionStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY) ||
    !!localStorage.getItem(AUTH_CONFIG.USER_TOKEN_KEY)
  );
}

export default init;
