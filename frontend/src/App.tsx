import { Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import '@/assets/styles/index.less';
import { init } from '@/router/init';

const router = createBrowserRouter(init());

const App = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default App;
