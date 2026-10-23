// src/api/axios.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:4000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 添加一个请求拦截器
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // 从localStorage获取token
        if (token) {
            config.headers['x-auth-token'] = token; // 将token添加到请求头
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;