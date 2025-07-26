import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './PersonalChat.css';

const PersonalChat = ({ otherUserId, otherUserName, onClose, isInline = false }) => {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatData, setChatData] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchChat();
    }, [otherUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchChat = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/chat/osobni/${otherUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setChatData(response.data.chat);
            setMessages(response.data.zpravy || []);
        } catch (error) {
            console.error('Chyba při načítání chatu:', error);
            alert('Nepodařilo se načíst chat');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            const response = await axios.post(
                `http://localhost:5000/api/chat/${chatData.id}/zpravy`,
                { text: newMessage.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Přidáme novou zprávu do seznamu
            setMessages(prev => [...prev, response.data.zprava]);
            setNewMessage('');
        } catch (error) {
            console.error('Chyba při odesílání zprávy:', error);
            alert('Nepodařilo se odeslat zprávu');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className={isInline ? "personal-chat-inline" : "personal-chat-overlay"}>
                <div className="personal-chat-container">
                    <div className="chat-loading">
                        <div className="loading-spinner"></div>
                        <p>Načítám chat...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={isInline ? "personal-chat-inline" : "personal-chat-overlay"}>
            <div className="personal-chat-container">
                <div className="chat-header">
                    <div className="chat-title">
                        <h3>💬 Chat s {otherUserName}</h3>
                    </div>
                    <button
                        className="close-button"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="no-messages">
                            <p>Zatím žádné zprávy. Začněte konverzaci!</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.odesilatel_id === user?.id ? 'my-message' : 'other-message'}`}
                            >
                                <div className="message-content">
                                    {message.odesilatel_id !== user?.id && (
                                        <div className="message-sender">
                                            {message.odesilatel?.jmeno || otherUserName}
                                        </div>
                                    )}
                                    <p>{message.text}</p>
                                    <small className="message-time">
                                        {formatTime(message.cas)}
                                    </small>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Napište zprávu..."
                        disabled={sending}
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="send-button"
                    >
                        {sending ? '⏳' : '📤'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PersonalChat;
