import { App as AntdApp, ConfigProvider } from 'antd';

import { Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import zhCN from 'antd/locale/zh_CN';

import '@/assets/styles/index.less';
import { init } from '@/router/init';

const router = createBrowserRouter(init());

const App = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <Suspense fallback={<div>加载中...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
