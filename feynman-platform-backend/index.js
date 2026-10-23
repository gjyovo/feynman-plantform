const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 引入 User 模型
const User = require('./models/User');

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
// 使用路由文件
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints')); // 新增

// 连接数据库
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// 测试路由
app.get('/', (req, res) => {
  res.send('Hello, Feynman Learner!');
});

// --- 核心：用户注册接口 ---
app.post('/api/register', async (req, res) => {
    try {
        // 1. 从请求体中获取数据
        const { username, email, password } = req.body;

        // 2. 检查用户或邮箱是否已存在
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email already exists' });
        }
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username already exists' });
        }

        // 3. 创建新用户实例
        user = new User({ username, email, password });

        // 4. 对密码进行哈希加密
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 5. 将新用户保存到数据库
        await user.save();

        // 6. 返回成功信息
        res.status(201).json({ msg: 'User registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});