import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PersonalChat from '../components/chat/PersonalChat';
import axios from 'axios';
import './Chat.css';

const Chat = () => {
    const { token, user } = useAuth();
    const [chaty, setChaty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        fetchMojeChaty();
    }, []);

    const fetchMojeChaty = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/chat/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Bereme jen osobní chaty (bez jizda_id)
            setChaty(response.data.osobni_chaty || []);
        } catch (err) {
            setError('Chyba při načítání chatů');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setSearchLoading(true);
            const response = await axios.get(`http://localhost:5000/api/uzivatele/hledat?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(response.data.uzivatele || []);
        } catch (err) {
            console.error('Chyba při vyhledávání:', err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const openChatWithUser = (otherUser) => {
        setSelectedChat({
            otherUserId: otherUser.id,
            otherUserName: otherUser.jmeno || otherUser.profil?.jmeno || 'Neznámý uživatel'
        });
        setShowChat(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const openExistingChat = (chat) => {
        // Najdeme druhého uživatele v chatu
        const otherUser = chat.ucastnici?.find(u => u.id !== user?.id);
        if (otherUser) {
            setSelectedChat({
                otherUserId: otherUser.id,
                otherUserName: otherUser.profil?.jmeno || 'Neznámý uživatel'
            });
            setShowChat(true);
        }
    };

    const closeChat = () => {
        setShowChat(false);
        setSelectedChat(null);
        // Znovu načteme chaty pro aktualizaci
        fetchMojeChaty();
    };

    const formatLastMessageTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'před chvílí';
        } else if (diffInHours < 24) {
            return `před ${Math.floor(diffInHours)}h`;
        } else {
            return date.toLocaleDateString('cs-CZ');
        }
    };

    if (loading) {
        return (
            <div className="chat-page">
                <div className="chat-sidebar">
                    <h1>Zprávy</h1>
                    <div className="loading">Načítání chatů...</div>
                </div>
                <div className="chat-main">
                    <div className="no-chat-selected">
                        <p>Načítání...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <div className="chat-sidebar">
                <div className="chat-header">
                    <h1>Zprávy</h1>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {/* Vyhledávání uživatelů */}
                <div className="search-section">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Vyhledat uživatele..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="search-input"
                        />
                        {searchLoading && <div className="search-spinner">⏳</div>}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="search-results">
                            <h4>Najít uživatele:</h4>
                            {searchResults.slice(0, 5).map(user => (
                                <div
                                    key={user.id}
                                    className="search-result-item"
                                    onClick={() => openChatWithUser(user)}
                                >
                                    <div className="user-avatar">
                                        {user.fotka ? (
                                            <img src={user.fotka} alt={user.jmeno} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {user.jmeno?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <span className="user-name">{user.jmeno}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Seznam existujících chatů */}
                <div className="chat-list">
                    <h3>Konverzace</h3>
                    {chaty.length === 0 ? (
                        <div className="no-chats">
                            <p>📭 Zatím nemáte žádné konverzace</p>
                            <p>Začněte psát někomu pomocí vyhledávání výše</p>
                        </div>
                    ) : (
                        chaty.map(chat => {
                            const otherUser = chat.ucastnici?.find(u => u.id !== user?.id);
                            const lastMessage = chat.posledni_zprava;

                            return (
                                <div
                                    key={chat.id}
                                    className="chat-list-item"
                                    onClick={() => openExistingChat(chat)}
                                >
                                    <div className="user-avatar">
                                        {otherUser?.profil?.fotka ? (
                                            <img src={otherUser.profil.fotka} alt={otherUser.profil.jmeno} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {otherUser?.profil?.jmeno?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-top">
                                            <span className="chat-name">
                                                {otherUser?.profil?.jmeno || 'Neznámý uživatel'}
                                            </span>
                                            {lastMessage?.cas && (
                                                <span className="chat-time">
                                                    {formatLastMessageTime(lastMessage.cas)}
                                                </span>
                                            )}
                                        </div>
                                        {lastMessage && (
                                            <div className="last-message">
                                                {lastMessage.odesilatel_id === user?.id ? 'Vy: ' : ''}
                                                {lastMessage.text.length > 50
                                                    ? lastMessage.text.substring(0, 50) + '...'
                                                    : lastMessage.text
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="chat-main">
                {!showChat ? (
                    <div className="no-chat-selected">
                        <div className="welcome-message">
                            <h2>� Vítejte v chatích</h2>
                            <p>Vyberte konverzaci ze seznamu vlevo nebo vyhledejte nového uživatele</p>
                            <div className="chat-tips">
                                <h4>💡 Tipy:</h4>
                                <ul>
                                    <li>Používejte vyhledávání pro nalezení nových lidí</li>
                                    <li>Všechny vaše konverzace zůstávají uložené</li>
                                    <li>Můžete psát i uživatelům, které jste potkali v jízdách</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="chat-container">
                        {selectedChat && (
                            <PersonalChat
                                otherUserId={selectedChat.otherUserId}
                                otherUserName={selectedChat.otherUserName}
                                onClose={closeChat}
                                isInline={true}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Mobilní overlay chat */}
            {showChat && selectedChat && (
                <div className="mobile-chat-overlay">
                    <PersonalChat
                        otherUserId={selectedChat.otherUserId}
                        otherUserName={selectedChat.otherUserName}
                        onClose={closeChat}
                    />
                </div>
            )}
        </div>
    );
};

export default Chat;
