import { Result } from 'antd';

import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，您访问的页面不存在"
      extra={
        <button onClick={() => navigate('/')} className="text-indigo-500 hover:text-indigo-700">
          返回首页
        </button>
      }
    />
  );
};

export default NotFoundPage;
