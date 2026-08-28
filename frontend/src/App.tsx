import type { FC } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { circleKTheme } from '@/config/themeConfig';
import { AppRouter } from '@/router';
import './index.css';


const App: FC = () => (
  <Provider store={store}>
    <ConfigProvider theme={circleKTheme} locale={viVN}>
      <AntdApp>
        <AppRouter />
      </AntdApp>
    </ConfigProvider>
  </Provider>
);

export default App;
