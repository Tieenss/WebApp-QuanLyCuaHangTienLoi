import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Layout, Typography } from 'antd';
import { Provider } from 'react-redux';
import { store } from './store';

const { Title } = Typography;

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={{ token: { colorPrimary: '#7C3AED' } }}>
        <Router>
          <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Routes>
              <Route path="/" element={<Title level={2}>ERP Cửa Hàng Tiện Lợi (Sắp ra mắt)</Title>} />
            </Routes>
          </Layout>
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App;
