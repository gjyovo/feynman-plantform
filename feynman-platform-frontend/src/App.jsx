import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 公共路由：谁都能访问 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* 受保护的路由：必须登录才能访问 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;