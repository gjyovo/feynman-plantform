import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css'; // 引入KaTeX的CSS样式

// 只初始化一次，关闭自动扫描（由下面的 MermaidBlock 主动渲染）
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
});

// ReactQuill 等富文本编辑器产出的内容是 HTML（通常以 <p> 等块级标签开头），
// 据此决定走「HTML 消毒后渲染」还是「Markdown 渲染」。
const HTML_BLOCK_RE = /^\s*<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|figure|img|br)\b/i;

// Mermaid 需要在客户端异步渲染，渲染失败时降级为普通代码块，保证页面不崩
function MermaidBlock({ chart }) {
    const [svg, setSvg] = useState('');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const renderChart = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
                const result = await mermaid.render(id, chart);
                if (!cancelled) setSvg(result.svg);
            } catch (err) {
                console.error('Mermaid 渲染失败', err);
                if (!cancelled) setFailed(true);
            }
        };

        renderChart();
        return () => {
            cancelled = true;
        };
    }, [chart]);

    if (failed || !svg) {
        return <pre><code>{chart}</code></pre>;
    }
    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

// react-markdown v10 的 code 组件已不再提供 inline 参数，这里通过 className 判断语言
const markdownComponents = {
    code({ className, children }) {
        const match = /language-(\w+)/.exec(className || '');
        if (match && match[1] === 'mermaid') {
            return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
        }
        return <code className={className}>{children}</code>;
    },
    pre({ children }) {
        const child = Array.isArray(children) ? children[0] : children;
        // MermaidBlock 返回的是 div，不能再被 <pre> 包裹
        if (/language-mermaid/.test(child?.props?.className || '')) {
            return <>{children}</>;
        }
        return <pre>{children}</pre>;
    },
};

// ReactQuill 保存的是 HTML，用户输入的 Markdown 源码只是被包在 <p> 里的普通文本，
// 直接当 HTML 渲染只会原样显示 "# 标题"、"$E=mc^2$"。
// 注意：Quill 会把空格存成 &nbsp;(U+00A0)，而 Markdown 只认普通空格，
// 因此必须先把 &nbsp; 还原，否则 "# 标题" 永远无法被识别为标题。
function htmlToMarkdown(html) {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '$&\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<[^>]+>/g, '')
        .replace(/&#39;|&#x27;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function RichContent({ content }) {
    if (!content) return null;

    const markdown = HTML_BLOCK_RE.test(content) ? htmlToMarkdown(content) : content;
    if (!markdown) return null;

    // react-markdown 默认不渲染原始 HTML，本身是安全的；
    // 公式渲染失败也不抛出异常（throwOnError: false），保证页面不报错。
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
            components={markdownComponents}
        >
            {markdown}
        </ReactMarkdown>
    );
}

function DashboardPage() {
    const [knowledgePoints, setKnowledgePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKnowledgePoints = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/knowledge-points');
                setKnowledgePoints(response.data);
            } catch (err) {
                setError('获取知识点失败，请确认是否登录或后端是否启动');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchKnowledgePoints();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('你确定要删除这个知识点吗？')) {
            try {
                await apiClient.delete(`/knowledge-points/${id}`);
                setKnowledgePoints(knowledgePoints.filter(kp => kp._id !== id));
            } catch (error) {
                console.error('删除失败', error);
            }
        }
    };

    if (loading) return <p>加载中...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h1>我的知识点</h1>
            <Link to="/kp/new">
                <button style={{ padding: '8px 16px', marginBottom: '20px' }}>+ 新建知识点</button>
            </Link>

            <div>
                {knowledgePoints.length === 0 ? (
                    <p>你还没有任何知识点，快去创建一个吧！</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {knowledgePoints.map((kp) => (
                            <li key={kp._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px', borderRadius: '5px' }}>
                                <h2>{kp.title}</h2>
                                <div className="markdown-content" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
                                    <RichContent content={kp.content} />
                                </div>
                                <p>状态: {kp.status}</p>
                                <Link to={`/kp/edit/${kp._id}`}>
                                    <button>编辑</button>
                                </Link>
                                <button onClick={() => handleDelete(kp._id)} style={{ marginLeft: '10px', background: 'red', color: 'white', border: 'none', padding: '2px 10px', borderRadius: '3px', cursor: 'pointer' }}>删除</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
export default DashboardPage;
