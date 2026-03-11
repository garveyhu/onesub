import { App as AntdApp, ConfigProvider, Spin } from 'antd';

import { Suspense } from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';

import zhCN from 'antd/locale/zh_CN';

import '@/assets/styles/index.less';
import { init } from '@/router/init';

const router = createHashRouter(init());

const LoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e8f4fd 50%, #f0f0ff 100%)',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <Spin size="large" />
      <div
        style={{
          marginTop: 16,
          fontSize: 15,
          fontWeight: 500,
          color: '#64748b',
          letterSpacing: '0.5px',
        }}
      >
        加载中...
      </div>
    </div>
  </div>
);

const App = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0ea5e9',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp message={{ duration: 1.5, maxCount: 2, top: 72 }}>
        <Suspense fallback={<LoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;

