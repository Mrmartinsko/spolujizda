import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import PersonalChat from '../components/chat/PersonalChat';
import api from '../services/api';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMojeChaty = async () => {
    try {
      const response = await api.get('/chat/moje', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setChaty(response.data.osobni_chaty || []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Chyba pri nacitani chatu.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.get(`/uzivatele/hledat?q=${encodeURIComponent(normalizedQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(response.data.uzivatele || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const openChatWithUser = (otherUser) => {
    setSelectedChat({
      otherUserId: otherUser.id,
      otherUserName: otherUser.jmeno || otherUser.profil?.jmeno || 'Neznamy uzivatel',
    });
    setShowChat(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openExistingChat = (chat) => {
    const otherUser = chat.ucastnici?.find((item) => item.id !== user?.id);
    if (!otherUser) return;

    setSelectedChat({
      otherUserId: otherUser.id,
      otherUserName: otherUser.profil?.jmeno || 'Neznamy uzivatel',
    });
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedChat(null);
    fetchMojeChaty();
  };

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'pred chvili';
    if (diffInHours < 24) return `pred ${Math.floor(diffInHours)} h`;
    return date.toLocaleDateString('cs-CZ');
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-sidebar">
          <h1>Zpravy</h1>
          <div className="loading">Nacitam chaty...</div>
        </div>
        <div className="chat-main">
          <div className="no-chat-selected">
            <p>Nacitam...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="chat-header">
          <h1>Zpravy</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Vyhledat uzivatele..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            {searchLoading && <div className="search-spinner">...</div>}
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Najit uzivatele:</h4>
              {searchResults.slice(0, 5).map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="search-result-item"
                  onClick={() => openChatWithUser(searchUser)}
                >
                  <div className="user-avatar">
                    {searchUser.fotka ? (
                      <img src={searchUser.fotka} alt={searchUser.jmeno} />
                    ) : (
                      <div className="avatar-placeholder">
                        {searchUser.jmeno?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{searchUser.jmeno}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-list">
          <h3>Konverzace</h3>
          {chaty.length === 0 ? (
            <div className="no-chats">
              <p>Zatim nemate zadne konverzace</p>
              <p>Zacnete psat nekomu pomoci vyhledavani vyse</p>
            </div>
          ) : (
            chaty.map((chat) => {
              const otherUser = chat.ucastnici?.find((item) => item.id !== user?.id);
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
                        {otherUser?.profil?.jmeno || 'Neznamy uzivatel'}
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
                          ? `${lastMessage.text.substring(0, 50)}...`
                          : lastMessage.text}
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
              <h2>Vitejte v chatech</h2>
              <p>Vyberte konverzaci ze seznamu vlevo nebo vyhledejte noveho uzivatele.</p>
            </div>
          </div>
        ) : (
          <div className="chat-container">
            {selectedChat && (
              <PersonalChat
                otherUserId={selectedChat.otherUserId}
                otherUserName={selectedChat.otherUserName}
                onClose={closeChat}
                isInline
              />
            )}
          </div>
        )}
      </div>

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
