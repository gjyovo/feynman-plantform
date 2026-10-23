import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Layout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();          // 清除全局 token
    navigate('/login'); // 跳转到登录页
  };

  return (
    <div className="app-layout">
      <nav style={{ background: '#1e293b', padding: '1rem', display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none' }}>
          主页
        </Link>

        {token ? (
          // 已登录：显示退出登录
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        ) : (
          // 未登录：显示登录和注册链接
          <>
            <Link to="/login" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none' }}>
              登录
            </Link>
            <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>
              注册
            </Link>
          </>
        )}
      </nav>

      <main style={{ padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;