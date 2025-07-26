import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import PersonalChat from '../components/chat/PersonalChat';
import './VyhledatUzivatele.css';

const VyhledatUzivatele = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchQuery.trim().length < 2) {
            setError('Vyhledávací dotaz musí mít alespoň 2 znaky');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`http://localhost:5000/api/uzivatele/hledat?q=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSearchResults(response.data.uzivatele || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vyhledávání uživatelů');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = (userId) => {
        navigate(`/profil/${userId}`);
    };

    const handleOpenChat = (user) => {
        setSelectedUser(user);
        setShowChat(true);
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedUser(null);
    };

    const formatRating = (rating) => {
        if (!rating) return 'Bez hodnocení';
        return `⭐ ${rating.toFixed(1)}`;
    };

    return (
        <div className="search-users-page">
            <div className="search-header">
                <h1>Vyhledat uživatele</h1>
                <p>Najděte ostatní uživatele spolujízdy</p>
            </div>

            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Zadejte jméno uživatele..."
                        className="search-input"
                    />
                    <button
                        type="submit"
                        disabled={loading || searchQuery.trim().length < 2}
                        className="search-button"
                    >
                        {loading ? '⏳' : '🔍'} {loading ? 'Hledám...' : 'Hledat'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                </div>
            )}

            {searchResults.length > 0 && (
                <div className="search-results">
                    <h2>Výsledky vyhledávání ({searchResults.length})</h2>
                    <div className="users-grid">
                        {searchResults.map((user) => (
                            <div key={user.id} className="user-card">
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
                                    <h3>{user.jmeno}</h3>

                                    <div className="user-ratings">
                                        <div className="rating">
                                            <small>Řidič:</small>
                                            <span>{formatRating(user.hodnoceni_ridic)}</span>
                                        </div>
                                        <div className="rating">
                                            <small>Pasažér:</small>
                                            <span>{formatRating(user.hodnoceni_pasazer)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="user-actions">
                                    <button
                                        onClick={() => handleUserClick(user.id)}
                                        className="btn-profile"
                                    >
                                        👤 Profil
                                    </button>
                                    <button
                                        onClick={() => handleOpenChat(user)}
                                        className="btn-chat"
                                    >
                                        💬 Chat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {searchQuery && !loading && searchResults.length === 0 && !error && (
                <div className="no-results">
                    <p>🔍 Žádní uživatelé nenalezeni</p>
                    <small>Zkuste změnit vyhledávací dotaz</small>
                </div>
            )}

            {showChat && selectedUser && (
                <PersonalChat
                    otherUserId={selectedUser.id}
                    otherUserName={selectedUser.jmeno}
                    onClose={handleCloseChat}
                />
            )}
        </div>
    );
};

export default VyhledatUzivatele;
