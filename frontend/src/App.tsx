import { ConfigProvider, App as AntdApp } from 'antd';
import { Provider } from 'react-redux';
import { store } from './store';
import { circleKTheme } from './config/themeConfig';
import { AppRouter } from './router';
import './index.css';
import './styles/dashboard.css';

function App() {
  return (
      <Provider store={store}>
        <ConfigProvider theme={circleKTheme}>
          <AntdApp>
            <AppRouter />
          </AntdApp>
        </ConfigProvider>
      </Provider>
  );
}

export default App;
