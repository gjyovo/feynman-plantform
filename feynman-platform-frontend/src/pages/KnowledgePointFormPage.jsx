import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactQuill from 'react-quill-new';
import RecordRTC from 'recordrtc';
import 'react-quill-new/dist/quill.snow.css';

function KnowledgePointFormPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const { id } = useParams(); // 从 URL 中取出 /kp/edit/:id 的 id
    const navigate = useNavigate();
    const isEditing = Boolean(id); // 有 id 就是编辑模式

    const streamRef = useRef(null);
    const recorderRef = useRef(null);

    // 编辑模式下，进入页面先拉取旧数据并回填表单
    useEffect(() => {
        if (!isEditing) return;
        const fetchKnowledgePoint = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get(`/knowledge-points/${id}`);
                setTitle(response.data.title);
                setContent(response.data.content);
            } catch (error) {
                console.error('获取知识点失败', error);
                alert('获取知识点失败');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchKnowledgePoint();
    }, [id, isEditing, navigate]);

    // 停止并释放麦克风
    const releaseStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    // 组件卸载时停止录音并释放麦克风，避免麦克风一直占用
    useEffect(() => {
        return () => {
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'recording') {
                recorder.stopRecording();
            }
            releaseStream();
        };
    }, []);

    // 开始录音
    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('当前浏览器不支持录音，请使用 Chrome 或 Edge');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/wav',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 16000,
            });

            recorder.startRecording();
            streamRef.current = stream;
            recorderRef.current = recorder;
            setIsRecording(true);
        } catch (error) {
            console.error('录音失败', error);
            releaseStream();
            alert('无法访问麦克风，请检查浏览器的麦克风权限');
        }
    };

    // 停止录音并上传识别，识别结果追加到富文本内容中
    const stopRecordingAndTranscribe = async () => {
        const recorder = recorderRef.current;
        if (!recorder) return;

        setIsRecording(false);
        setIsTranscribing(true);
        try {
            await new Promise((resolve) => recorder.stopRecording(resolve));
            const audioBlob = recorder.getBlob();
            releaseStream();

            if (!audioBlob || audioBlob.size === 0) {
                alert('录音内容为空，请重新录制');
                return;
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');

            const response = await apiClient.post('/audio/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const text = (response.data && response.data.result ? response.data.result : '').trim();
            if (!text) {
                alert('没有识别到文字，请重新录制');
                return;
            }

            // 函数式更新，保证追加时拿到的是最新的 content
            setContent((prev) => `${prev}<p><br></p><p>${text}</p>`);
        } catch (error) {
            console.error('语音识别失败', error);
            alert('语音识别失败，请检查后端是否正常');
        } finally {
            recorderRef.current = null;
            releaseStream();
            setIsTranscribing(false);
        }
    };

    const handleRecordToggle = async () => {
        if (isTranscribing) return;
        if (isRecording) {
            await stopRecordingAndTranscribe();
        } else {
            await startRecording();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. 先将可能被 React-Quill 转义的实体字符还原，避免 &lt;script&gt; 逃过过滤
        const decodedContent = content
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&#x27;/gi, "'")
            .replace(/&nbsp;/gi, ' ');

        // 2. 精准清除危险内容：<script>、<iframe>、以及带 onerror/onload 等事件属性的标签
        const filteredContent = decodedContent
            // 整段删除 script / iframe 元素（含内部内容）
            .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
            .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
            // 删除残留的 script / iframe 标签（未闭合的情况）
            .replace(/<\/?(?:script|iframe)\b[^>]*>/gi, '')
            // 删除任何带 onerror、onload 等 on* 事件属性的标签；正常的 <img> 不受影响
            .replace(/<[^>]*\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi, '');

        // 3. 把 Quill 富文本标签转换成 Markdown，保证加粗、斜体等格式保存后依然生效
        const markdownContent = filteredContent
            .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (match, level, text) => `\n${'#'.repeat(Number(level))} ${text}\n`)
            .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, '**$2**')
            .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, '*$2*')
            .replace(/<(s|strike|del)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, '~~$2~~')
            .replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, '`$1`')
            .replace(/<a\b[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a\s*>/gi, '[$2]($1)')
            .replace(/<li\b[^>]*>/gi, '- ')
            .replace(/<\/li\s*>/gi, '\n')
            .replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '\n')
            .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (match, text) => `\n> ${text.trim()}\n`)
            // Markdown 没有下划线语法，只能保留文字
            .replace(/<u\b[^>]*>([\s\S]*?)<\/u\s*>/gi, '$1');

        // 4. 剥离其余 HTML 标签，只保留纯文字和正常的 <img> 标签（保留段落换行）
        const cleanContent = markdownContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<(?!img\b)[^>]*>/gi, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // 5. 提交清洗后的内容：编辑走 PUT，新建走 POST
        const kpData = { title, content: cleanContent };
        try {
            if (isEditing) {
                await apiClient.put(`/knowledge-points/${id}`, kpData);
            } else {
                await apiClient.post('/knowledge-points', kpData);
            }
            navigate('/');
        } catch (error) {
            console.error('保存知识点失败', error);
            alert('保存失败，请检查后端是否正常');
        }
    };

    if (loading) return <p>加载中...</p>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1>{isEditing ? '编辑知识点' : '新建知识点'}</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>标题:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px' }}
                        required
                    />
                </div>

                <div style={{ marginBottom: '4rem' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>内容:</label>
                    <button
                        type="button"
                        onClick={handleRecordToggle}
                        disabled={isTranscribing}
                        style={{
                            marginBottom: '10px',
                            padding: '8px 16px',
                            backgroundColor: isRecording ? '#dc2626' : '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isTranscribing ? 'not-allowed' : 'pointer',
                            opacity: isTranscribing ? 0.7 : 1,
                        }}
                    >
                        {isTranscribing ? '识别中...' : isRecording ? '⏹️ 停止并识别' : '🎤 语音输入'}
                    </button>
                    <ReactQuill
                        theme="snow"
                        value={content}
                        onChange={setContent}
                        style={{ height: '300px' }}
                    />
                </div>

                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isEditing ? '更新' : '保存'}
                </button>
            </form>
        </div>
    );
}

export default KnowledgePointFormPage;
