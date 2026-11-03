import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import RecordRTC from 'recordrtc';

function FeynmanRecordPage() {
    const { id } = useParams(); 
    const [kpTitle, setKpTitle] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const recorder = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        const fetchKpTitle = async () => {
            try {
                const response = await apiClient.get(`/knowledge-points/${id}`);
                setKpTitle(response.data.title);
            } catch (error) {
                console.error('获取标题失败', error);
            }
        };
        fetchKpTitle();
    }, [id]);

    // 开始录音
    const startRecording = async () => {
        try {
            setTranscribedText('');
            // 获取麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 强制录制为 WAV 格式（百度 AI 最认的格式）
            recorder.current = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/wav',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 16000, // 百度要求 16000 采样率
            });

            recorder.current.startRecording();
            setIsRecording(true);
        } catch (error) {
            console.error('无法获取麦克风权限', error);
            alert('请允许浏览器使用麦克风！');
        }
    };

    // 停止录音并上传
    const stopRecording = () => {
        if (!recorder.current) return;
        
        setIsRecording(false);
        recorder.current.stopRecording(async () => {
            const blob = recorder.current.getBlob();
            
            // 停止麦克风轨道
            streamRef.current.getTracks().forEach(track => track.stop());

            // 上传给后端
            setIsUploading(true);
            try {
                const audioFile = new File([blob], `record-${id}.wav`, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioFile); 

                const response = await apiClient.post('/audio/transcribe', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                
                setTranscribedText(response.data.result);
            } catch (error) {
                console.error('转录失败', error);
                setTranscribedText('转录失败，请检查后端');
            } finally {
                setIsUploading(false);
            }
        });
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h1>🎤 复述知识点: {kpTitle}</h1>
            
            <div style={{ margin: '20px 0' }}>
                <button 
                    onClick={startRecording} 
                    disabled={isRecording}
                    style={{ padding: '10px 20px', marginRight: '10px', background: isRecording ? '#ccc' : '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: isRecording ? 'not-allowed' : 'pointer' }}
                >
                    {isRecording ? '正在录音...' : '开始录音'}
                </button>
                
                <button 
                    onClick={stopRecording} 
                    disabled={!isRecording}
                    style={{ padding: '10px 20px', background: !isRecording ? '#ccc' : 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: !isRecording ? 'not-allowed' : 'pointer' }}
                >
                    停止并识别
                </button>
            </div>

            <hr style={{ margin: '30px 0' }} />

            <h2>AI 转录结果:</h2>
            {isUploading && <p style={{ color: 'blue' }}>正在上传并请求百度 AI 转录...</p>}
            <div style={{ border: '1px solid #ccc', padding: '15px', minHeight: '100px', background: '#f9f9f9', borderRadius: '5px' }}>
                {transcribedText || '这里将显示语音转换后的文字...'}
            </div>
            
            <br />
            <Link to="/">返回主页</Link>
        </div>
    );
}

export default FeynmanRecordPage;