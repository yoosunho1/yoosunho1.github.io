import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

// 마크다운 렌더링 컴포넌트
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const renderMarkdown = (text: string) => {
        let html = text;

        // 코드 블록
        html = html.replace(/``````/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>');

        // 인라인 코드
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // 헤더
        html = html.replace(/^### (.*$)/gm, '<h3 class="markdown-h3">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 class="markdown-h2">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1 class="markdown-h1">$1</h1>');

        // 볼드
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-bold">$1</strong>');

        // 이탤릭
        html = html.replace(/\*(.*?)\*/g, '<em class="markdown-italic">$1</em>');

        // 리스트
        html = html.replace(/^- (.*$)/gm, '<li class="markdown-li">$1</li>');
        html = html.replace(/(<li class="markdown-li">.*<\/li>)/gs, '<ul class="markdown-ul">$1</ul>');

        // 줄바꿈
        html = html.replace(/\n/g, '<br>');

        return html;
    };

    return (
        <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
    );
};

// 향상된 로딩 애니메이션 컴포넌트
const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-3 p-4">
        <div className="typing-animation">
            <div className="typing-dot typing-dot-1"></div>
            <div className="typing-dot typing-dot-2"></div>
            <div className="typing-dot typing-dot-3"></div>
        </div>
        <span className="text-muted-foreground text-sm">응답을 생성하고 있습니다...</span>
    </div>
);

const App: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 유틸: 사용자 메시지 존재 여부
    const hasUserMessages = (msgs: Message[]) => msgs.some(m => m.role === 'user');

    // 새 채팅 1개를 즉시 생성하고 좌측 목록에도 등록
    const createNewChatSession = () => {
        const id = Date.now().toString();
        const initial: Message = {
            id: '1',
            role: 'assistant',
            content: '안녕하세요! 유선호 AI입니다. 무엇을 도와드릴까요?',
            timestamp: new Date(),
        };
        const newMessages = [initial];

        setMessages(newMessages);
        setCurrentSessionId(id);

        const newSession: ChatSession = {
            id,
            title: '새 채팅',
            messages: newMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        setChatSessions(prev => {
            const updated = [newSession, ...prev].slice(0, 10);
            localStorage.setItem('chatSessions', JSON.stringify(updated));
            return updated;
        });

        localStorage.setItem('currentChatSession', JSON.stringify({ id, messages: newMessages }));
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    // 초기 로드
    useEffect(() => {
        loadChatSessions();
        loadCurrentSession();
    }, []);

    // 사용자 메시지가 있을 때만 세션 저장(제목 갱신 포함)
    useEffect(() => {
        const hasUser = hasUserMessages(messages);
        if (!hasUser) return;
        if (messages.length < 2) return;
        saveCurrentSession();
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, [inputValue]);

    const loadChatSessions = () => {
        const saved = localStorage.getItem('chatSessions');
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved)
                .filter((s: any) => s && Array.isArray(s.messages))
                .map((s: any) => ({
                    ...s,
                    createdAt: new Date(s.createdAt),
                    updatedAt: new Date(s.updatedAt),
                    title: typeof s.title === 'string' && s.title.length > 0 ? s.title : '새 채팅',
                    messages: s.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                    })),
                }));
            setChatSessions(parsed);
        } catch (e) {
            console.error('Failed to load chat sessions', e);
        }
    };

    const loadCurrentSession = () => {
        const saved = localStorage.getItem('currentChatSession');
        if (!saved) {
            // 현재 세션이 없다면 UX를 위해 즉시 1개 만들기
            createNewChatSession();
            return;
        }
        try {
            const s = JSON.parse(saved);
            const parsedMessages = s.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
            }));
            setMessages(parsedMessages);
            setCurrentSessionId(s.id);
        } catch (e) {
            console.error('Failed to load current session', e);
            createNewChatSession();
        }
    };

    // 사용자 메시지가 생겼을 때만 저장 + 제목 갱신
    const saveCurrentSession = () => {
        if (messages.length === 0) return;
        if (!hasUserMessages(messages)) return;

        const id = currentSessionId || Date.now().toString();
        const firstUser = messages.find(m => m.role === 'user');

        localStorage.setItem('currentChatSession', JSON.stringify({ id, messages }));

        const now = new Date();
        const newTitle = firstUser
            ? (firstUser.content.length > 25 ? firstUser.content.slice(0, 25) + '...' : firstUser.content)
            : '새 채팅';

        setChatSessions(prev => {
            const idx = prev.findIndex(s => s.id === id);
            const base: ChatSession =
                idx >= 0
                    ? prev[idx]
                    : { id, title: '새 채팅', messages, createdAt: now, updatedAt: now };

            const updatedSession: ChatSession = {
                ...base,
                title: newTitle,
                messages,
                updatedAt: now,
            };

            const next =
                idx >= 0 ? prev.map((s, i) => (i === idx ? updatedSession : s)) : [updatedSession, ...prev];

            localStorage.setItem('chatSessions', JSON.stringify(next.slice(0, 10)));
            return next.slice(0, 10);
        });

        if (!currentSessionId) setCurrentSessionId(id);
    };

    const buildChatHistory = (currentUserMessage: string) => {
        const recent = messages.slice(-10);
        if (recent.length <= 1) return `사용자: ${currentUserMessage}`;
        const history = recent
            .slice(1)
            .map(m => `${m.role === 'user' ? '사용자' : '어시스턴트'}: ${m.content}`)
            .join('\n');
        return `\n\n[대화 히스토리]\n${history}\n\n[현재 질문]\n사용자: ${currentUserMessage}`;
    };

    const callGeminiAPI = async (userMessage: string) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const prompt = buildChatHistory(userMessage);
        const result = await model.generateContent(prompt);
        return result.response.text();
    };

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isLoading) return;
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const responseText = await callGeminiAPI(userMsg.content);
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err: any) {
            const errMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `죄송합니다. 오류가 발생했습니다: ${err?.message ?? 'Unknown error'}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 새 채팅: 비어있는 새 채팅이 있으면 전환, 없으면 생성
    const handleResetChat = () => {
        const blank = chatSessions.find(s => !hasUserMessages(s.messages));
        if (blank) {
            setMessages(blank.messages);
            setCurrentSessionId(blank.id);
            localStorage.setItem('currentChatSession', JSON.stringify({ id: blank.id, messages: blank.messages }));
            setTimeout(() => textareaRef.current?.focus(), 100);
            return;
        }
        createNewChatSession();
    };

    const loadChatSession = (id: string) => {
        const s = chatSessions.find(x => x.id === id);
        if (!s) return;
        setMessages(s.messages);
        setCurrentSessionId(id);
        localStorage.setItem('currentChatSession', JSON.stringify({ id, messages: s.messages }));
    };

    // 삭제 모달
    const showDeleteConfirmation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessionToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDeleteSession = () => {
        if (!sessionToDelete) return;

        let remainingSessions: ChatSession[] = [];

        // localStorage에서 제거
        const saved = localStorage.getItem('chatSessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as ChatSession[];
                remainingSessions = parsed.filter(s => s.id !== sessionToDelete);
                localStorage.setItem('chatSessions', JSON.stringify(remainingSessions));
            } catch (e) {
                console.error('Error deleting session:', e);
            }
        }

        // 상태에서도 제거
        setChatSessions(remainingSessions);

        // 현재 열려있던 세션을 지웠다면
        if (currentSessionId === sessionToDelete) {
            localStorage.removeItem('currentChatSession');

            // 남은 세션이 있는지 확인
            if (remainingSessions.length > 0) {
                // 가장 최근 세션으로 전환
                const mostRecent = remainingSessions[0];

                // 메시지의 timestamp를 Date 객체로 변환
                const parsedMessages = mostRecent.messages.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));

                setMessages(parsedMessages);
                setCurrentSessionId(mostRecent.id);
                localStorage.setItem('currentChatSession', JSON.stringify({
                    id: mostRecent.id,
                    messages: parsedMessages
                }));
                // 포커스를 textarea로 이동
                setTimeout(() => textareaRef.current?.focus(), 100);
            } else {
                // 남은 세션이 없을 때만 새 채팅 생성
                setMessages([]);
                setCurrentSessionId(null);
                setTimeout(() => createNewChatSession(), 100);
            }
        }

        setShowDeleteModal(false);
        setSessionToDelete(null);
    };


    const cancelDelete = () => {
        setShowDeleteModal(false);
        setSessionToDelete(null);
    };

    // 아이콘
    const UserIcon = () => (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
        </div>
    );

    const AssistantIcon = () => (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg flex items-center justify-center text-white font-bold text-sm korean-logo">
            선호
        </div>
    );

    const DeleteModal = () =>
        showDeleteModal ? (
            <div className="modal-overlay" onClick={cancelDelete}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-foreground mb-2">대화 삭제</h3>
                    <p className="text-muted-foreground mb-6">이 대화를 완전히 삭제하시겠습니까? 삭제된 대화는 복구할 수 없습니다.</p>
                    <div className="flex justify-end space-x-3">
                        <button onClick={cancelDelete} className="modal-button modal-button-secondary">취소</button>
                        <button onClick={confirmDeleteSession} className="modal-button modal-button-danger">삭제</button>
                    </div>
                </div>
            </div>
        ) : null;

    return (
        <>
            <style>{`
                .markdown-content h1.markdown-h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 1rem 0 0.5rem 0;
                    color: var(--foreground);
                }
                .markdown-content h2.markdown-h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0.875rem 0 0.5rem 0;
                    color: var(--foreground);
                }
                .markdown-content h3.markdown-h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0.75rem 0 0.5rem 0;
                    color: var(--foreground);
                }
                .markdown-content .markdown-bold {
                    font-weight: 600;
                    color: var(--foreground);
                }
                .markdown-content .markdown-italic {
                    font-style: italic;
                }
                .markdown-content .inline-code {
                    background: rgba(127, 140, 160, 0.15);
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.375rem;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 0.875rem;
                    border: 1px solid rgba(127, 140, 160, 0.2);
                }
                .markdown-content .code-block {
                    background: rgba(127, 140, 160, 0.1);
                    border: 1px solid rgba(127, 140, 160, 0.2);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 0.75rem 0;
                    overflow-x: auto;
                }
                .markdown-content .code-block code {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 0.875rem;
                    color: var(--foreground);
                }
                .markdown-content .markdown-ul {
                    margin: 0.5rem 0;
                    padding-left: 1.5rem;
                }
                .markdown-content .markdown-li {
                    margin: 0.25rem 0;
                    list-style-type: disc;
                }

                .typing-animation {
                    display: flex;
                    align-items: center;
                    space-x: 0.25rem;
                }
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #6b7280;
                    animation: typing 1.4s infinite ease-in-out;
                    margin-right: 4px;
                }
                .typing-dot-1 { animation-delay: 0s; }
                .typing-dot-2 { animation-delay: 0.2s; }
                .typing-dot-3 { animation-delay: 0.4s; }

                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0px);
                        opacity: 0.5;
                    }
                    30% {
                        transform: translateY(-10px);
                        opacity: 1;
                    }
                }
            `}</style>
            <div className="flex h-screen bg-background text-foreground antialiased">
                {/* 사이드바 */}
                <aside className="hidden md:flex md:w-72 lg:w-80 flex-col p-6 relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg flex items-center justify-center text-white font-bold text-sm korean-logo">
                            선호
                        </div>
                        <h1 className="text-xl font-semibold text-foreground">유선호 AI</h1>
                    </div>

                    <button
                        onClick={handleResetChat}
                        className="modern-button w-full py-3 px-4 text-foreground transition-all duration-200 rounded-xl flex items-center justify-center font-medium text-sm mb-6"
                    >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        새 채팅
                    </button>

                    {/* 최근 대화 */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">최근 대화</h3>
                        <div className="space-y-2">
                            {chatSessions.map(session => (
                                <div
                                    key={session.id}
                                    className={`chat-history-item flex items-center justify-between p-3 rounded-lg text-sm ${
                                        currentSessionId === session.id ? 'active' : ''
                                    }`}
                                >
                                    <button onClick={() => loadChatSession(session.id)} className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-foreground mb-1 chat-title">{session.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(session.updatedAt).toLocaleDateString()}
                                        </div>
                                    </button>
                                    <button
                                        onClick={e => showDeleteConfirmation(session.id, e)}
                                        className="delete-button ml-2 flex-shrink-0"
                                        title="대화 삭제"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-6 soft-divider-top">
                        <p className="text-xs text-center text-muted-foreground">Powered by Gemini</p>
                    </div>
                </aside>

                {/* 메인 */}
                <main className="flex-1 flex flex-col">
                    <header className="md:hidden flex items-center justify-between p-4 soft-divider-bottom bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md flex items-center justify-center text-white font-bold text-xs korean-logo">
                                선호
                            </div>
                            <h1 className="text-lg font-semibold">선호 Chat</h1>
                        </div>
                        <button
                            onClick={handleResetChat}
                            className="p-2 rounded-lg hover:bg-muted/60 transition-colors"
                            aria-label="새 채팅"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map(m => (
                                <div key={m.id} className={`flex gap-4 items-start ${m.role === 'user' ? 'justify-end' : ''}`}>
                                    {m.role === 'assistant' && <AssistantIcon />}
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                                            m.role === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-br-md user-message-bubble'
                                                : 'bg-muted text-foreground rounded-bl-md ai-message-bubble'
                                        }`}
                                    >
                                        {m.role === 'assistant' ? (
                                            <MarkdownRenderer content={m.content} />
                                        ) : (
                                            <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                                        )}
                                        <div className={`text-xs mt-3 ${m.role === 'user' ? 'text-white/80' : 'text-muted-foreground'}`}>
                                            {m.timestamp instanceof Date
                                                ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            }
                                        </div>
                                    </div>
                                    {m.role === 'user' && <UserIcon />}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-4 items-start">
                                    <AssistantIcon />
                                    <div className="bg-muted rounded-2xl rounded-bl-md px-5 py-4 ai-message-bubble">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-4 md:p-6 soft-divider-top bg-card/80 backdrop-blur-sm">
                        <div className="max-w-3xl mx-auto">
                            <div className={`modern-input flex items-end p-3 rounded-2xl transition-all duration-300 ${isLoading ? 'disabled' : ''}`}>
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isLoading ? '응답 대기 중...' : '메시지를 입력하세요...'}
                                    className="flex-1 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 px-2 py-2 max-h-48 placeholder-muted-foreground"
                                    disabled={isLoading}
                                    rows={1}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={inputValue.trim() === '' || isLoading}
                                    className="bg-gradient-to-r from-blue-500 to-sky-400 text-white rounded-xl p-3 ml-3 hover:from-blue-600 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
                                    aria-label="Send message"
                                >
                                    {isLoading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="m22 2-7 20-4-9-9-4z" />
                                            <path d="M22 2 11 13" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-center text-muted-foreground mt-3">Enter: 전송, Shift+Enter: 줄바꿈</p>
                        </div>
                    </div>
                </main>

                <DeleteModal />
            </div>
        </>
    );
};

export default App;
