import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input, List, Spin } from 'antd'; // Using axios for consistency with your other routes
import apiFetch from '../../config/fetchConfig';

const Chatbot = ({ isChatbotOpen, setIsChatbotOpen }) => {
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! How can I help you today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto-scroll to the bottom of the chat list
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;

        const userMessage = { role: 'user', content: chatMessage };
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

            setMessages([...updatedMessages, {
                role: 'assistant',
                content: botReply
            }]);
        } catch (error) {
            console.error("Full Error Object:", error.response); // This is key to debugging!

            // Extract the error message from the backend if it exists
            const errorMsg = error.response?.data?.error || "Connection error. Check backend console.";

            setMessages([...updatedMessages, {
                role: 'assistant',
                content: `Error: ${errorMsg}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isChatbotOpen}
            onCancel={() => setIsChatbotOpen(false)}
            footer={null}
            title="TRAVEX Assistant"
            wrapClassName="chatbot-modal"
            width={400}
        >
            <div className="chatbot-body" style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>

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
                                <div style={{
                                    display: 'inline-block',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    backgroundColor: item.role === 'user' ? '#305797' : '#f0f0f0',
                                    color: item.role === 'user' ? '#fff' : '#000',
                                    maxWidth: '80%'
                                }}>
                                    {item.content}
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
                    <div className="chatbot-actions" style={{ marginTop: '10px', textAlign: 'right' }}>
                        <Button
                            type="primary"
                            onClick={handleSendMessage}
                            loading={loading}
                            disabled={!chatMessage.trim()}
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