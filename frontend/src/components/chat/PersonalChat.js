import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PersonalChat.css';
import { useNavigate } from 'react-router-dom';

const PersonalChat = ({ otherUserId, onClose, isInline = false }) => {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatData, setChatData] = useState(null);
    const [sending, setSending] = useState(false);
    const [otherUserName, setOtherUserName] = useState('');
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!otherUserId) {
            alert("Chyba: Neznámý uživatel chatu");
            return;
        }
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
            const response = await api.get(`/chat/osobni/${otherUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setChatData(response.data.chat);
            setMessages(response.data.zpravy || []);

            // Najdi druhého uživatele chatu
            const druhej = response.data.chat.ucastnici.find(u => u.id !== user.id);
            setOtherUserName(druhej.profil?.jmeno || druhej.email);
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
            const response = await api.post(
                `/chat/${chatData.id}/zpravy`,
                { text: newMessage.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

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
                        onClick={() => navigate('/moje-chaty')}
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
