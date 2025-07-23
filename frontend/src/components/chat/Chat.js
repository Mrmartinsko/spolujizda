import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Chat.css';

const Chat = ({ jizdaId, onClose }) => {
    const { token, user } = useAuth();
    const [zpravy, setZpravy] = useState([]);
    const [novaZprava, setNovaZprava] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (jizdaId) {
            fetchZpravy();
            // V produkci by zde byl WebSocket pro real-time chat
            const interval = setInterval(fetchZpravy, 3000); // Polling každé 3 sekundy
            return () => clearInterval(interval);
        }
    }, [jizdaId]);

    useEffect(() => {
        scrollToBottom();
    }, [zpravy]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchZpravy = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/chat/jizda/${jizdaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setZpravy(response.data);
        } catch (err) {
            setError('Chyba při načítání zpráv');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!novaZprava.trim()) return;

        try {
            await axios.post(
                `http://localhost:5000/api/chat/jizda/${jizdaId}/zprava`,
                { text: novaZprava },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNovaZprava('');
            fetchZpravy(); // Aktualizace zpráv
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při odesílání zprávy');
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
            <div className="chat-container">
                <div className="chat-header">
                    <h3>Chat</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="loading">Načítám chat...</div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3>Chat k jízdě</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="chat-messages">
                {zpravy.length === 0 ? (
                    <div className="no-messages">Zatím žádné zprávy</div>
                ) : (
                    zpravy.map(zprava => (
                        <div
                            key={zprava.id}
                            className={`message ${zprava.odesilatel_id === user?.id ? 'own' : 'other'}`}
                        >
                            <div className="message-header">
                                <span className="sender-name">
                                    {zprava.odesilatel?.profil?.jmeno || 'Neznámý'}
                                </span>
                                <span className="message-time">
                                    {formatTime(zprava.cas)}
                                </span>
                            </div>
                            <div className="message-text">
                                {zprava.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input">
                <input
                    type="text"
                    value={novaZprava}
                    onChange={(e) => setNovaZprava(e.target.value)}
                    placeholder="Napište zprávu..."
                    maxLength="500"
                />
                <button type="submit" disabled={!novaZprava.trim()}>
                    Odeslat
                </button>
            </form>
        </div>
    );
};

export default Chat;
