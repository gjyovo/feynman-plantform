import { useState } from 'react';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/users/login', { email, password });
      console.log("登录成功，拿到Token啦:", response.data.token);
      login(response.data.token); // 存入全局状态
      navigate('/');              // 跳转到主页
    } catch (err) {
      setError(err.response?.data?.msg || '登录失败，请检查邮箱或密码');
    }
  };

  return (
    <div>
      <h1>登录</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>邮箱: </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" required />
        </div>
        <div>
          <label>密码: </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" required />
        </div>
        <button type="submit">登录</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;