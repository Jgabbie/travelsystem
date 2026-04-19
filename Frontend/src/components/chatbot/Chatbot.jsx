import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input, List, Spin } from 'antd'; // Using axios for consistency with your other routes
import { RobotOutlined, UserOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import apiFetch from '../../config/fetchConfig';
import '../../style/components/chatbot.css';

const initialMessages = [
    { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: new Date().toISOString() }
];

const Chatbot = ({ isChatbotOpen, setIsChatbotOpen }) => {
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState(initialMessages);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto-scroll to the bottom of the chat list
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const formatTimestamp = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString();
    };

    const createMessage = (role, content) => ({
        role,
        content,
        timestamp: new Date().toISOString()
    });

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;

        const userMessage = createMessage('user', chatMessage);
        const updatedMessages = [...messages, userMessage];
        const recentMessages = updatedMessages.slice(-3);

        setMessages(updatedMessages);
        setChatMessage('');
        setLoading(true);

        try {
            const response = await apiFetch.post('/chatbot/chat', {
                messages: recentMessages
            });

            // Optional Chaining (?.) and a fallback message
            const botReply = response?.reply || "I received an empty response. Please try again.";

            setMessages([...updatedMessages, createMessage('assistant', botReply)]);
        } catch (error) {
            console.error("Full Error Object:", error.response); // This is key to debugging!

            // Extract the error message from the backend if it exists
            const errorMsg = error.response?.data?.error || "Connection error. Check backend console.";

            setMessages([...updatedMessages, createMessage('assistant', `Error: ${errorMsg}`)]);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages(initialMessages);
        setChatMessage('');
        setLoading(false);
    };

    return (
        <Modal
            open={isChatbotOpen}
            onCancel={() => setIsChatbotOpen(false)}
            footer={null}
            title="TRAVEX Assistant"
            wrapClassName="chatbot-modal"
            width={900}
            className='chatbot-modal'
        >
            <div className="chatbot-body" style={{ display: 'flex', flexDirection: 'column', height: '450px', width: '100%' }}>

                {/* Message Display Area */}
                <div
                    className="messages-window"
                    ref={scrollRef}
                    style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', padding: '10px', border: '1px solid #f0f0f0', borderRadius: '8px' }}
                >
                    <List
                        dataSource={messages}
                        renderItem={(item) => (
                            <div style={{
                                textAlign: item.role === 'user' ? 'right' : 'left',
                                marginBottom: '10px'
                            }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                                        fontSize: '11px',
                                        color: '#6b7280',
                                        marginBottom: '4px'
                                    }}
                                >
                                    {item.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                    <span>{item.role === 'user' ? 'You' : 'TRAVEX Assistant'}</span>
                                    <span>•</span>
                                    <span>{formatTimestamp(item.timestamp)}</span>
                                </div>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    backgroundColor: item.role === 'user' ? '#305797' : '#f0f0f0',
                                    color: item.role === 'user' ? '#fff' : '#000',
                                    maxWidth: '80%'
                                }}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }) => (
                                                <span style={{ textAlign: 'justify', display: 'inline-block' }}>
                                                    {children}
                                                </span>
                                            )
                                        }}
                                    >
                                        {item.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    />
                    {loading && (
                        <div style={{ textAlign: 'left', color: '#8c8c8c', fontSize: '12px' }}>
                            <Spin size="small" style={{ marginRight: '8px' }} /> TRAVEX is thinking...
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="chatbot-input-section">
                    <Input.TextArea
                        maxLength={150}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        rows={3}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <div className="chatbot-actions" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button
                            className='chatbot-send-button'
                            type='primary'
                            onClick={handleNewChat}
                            disabled={loading}
                            icon={<ReloadOutlined />}
                        >
                            New Chat
                        </Button>
                        <Button
                            className='chatbot-send-button'
                            type="primary"
                            onClick={handleSendMessage}
                            loading={loading}
                            disabled={!chatMessage.trim()}
                            icon={<SendOutlined />}
                        >
                            Send
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default Chatbot;