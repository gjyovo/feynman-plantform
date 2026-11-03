const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
// 👇 引入百度AI控制器
const { transcribeAudio } = require('../controllers/baiduAiController');

const upload = multer({ storage: multer.memoryStorage() });

router.post(
    '/transcribe',
    auth,
    upload.single('audio'), 
    transcribeAudio // 👈 把刚刚收到的录音，立刻交给 AI 处理
);

module.exports = router;