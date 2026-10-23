import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom'; // 3. 获取navigate函数
import { useAuth } from '../context/AuthContext.jsx'; // 👈 补充：需要引入 useAuth

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  
  const navigate = useNavigate(); 
  const { login } = useAuth(); // 4. 获取login函数

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => { // 4. 将函数改为async
    e.preventDefault();
    setError(''); // 清空之前的错误信息
    
    try {
      // 5. 使用apiClient发送POST请求
      const response = await apiClient.post('/users/register', formData);
      console.log('注册成功:', response.data);
      
      // 👇 核心修改在这里：注册成功后直接进主页 👇
      login(response.data.token); // 把后端发来的 token 存进全局状态
      navigate('/');              // 跳转到主页（仪表盘）
      // 👆 核心修改结束 👆

    } catch (err) {
      console.error('注册失败:', err.response?.data); // 优化：加上可选链 ? 防止崩溃
      setError(err.response?.data?.msg || '注册失败，请稍后再试'); // 7. 显示错误提示
    }
  };

  // 下面是你页面的 return 结构（照着原来写就行）
  return (
    <div>
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>用户名: </label>
          <input name="username" type="text" value={formData.username} onChange={handleChange} placeholder="用户名" required />
        </div>
        <div>
          <label>邮箱: </label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="邮箱" required />
        </div>
        <div>
          <label>密码: </label>
          <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="密码" required />
        </div>
        <button type="submit">注册</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default RegisterPage;