import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactQuill from 'react-quill-new'; 
import 'react-quill-new/dist/quill.snow.css'; 

function KnowledgePointFormPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); 
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/knowledge-points', { title, content });
            navigate('/'); 
        } catch (error) {
            console.error('保存知识点失败', error);
            alert('保存失败，请检查后端是否正常');
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1>新建知识点</h1>
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
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        style={{ height: '300px' }} 
                    />
                </div>
                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    保存
                </button>
            </form>
        </div>
    );
}

export default KnowledgePointFormPage;