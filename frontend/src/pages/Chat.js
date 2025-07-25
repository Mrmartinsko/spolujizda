import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatComponent from '../components/chat/Chat';
import axios from 'axios';

const Chat = () => {
    const { token, user } = useAuth();
    const [chaty, setChaty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedJizdaId, setSelectedJizdaId] = useState(null);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        fetchMojeChaty();
    }, []);

    const fetchMojeChaty = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/chat/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChaty(response.data.chaty_jizd || []);
        } catch (err) {
            setError('Chyba při načítání chatů');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openChat = (jizdaId) => {
        setSelectedJizdaId(jizdaId);
        setShowChat(true);
    };

    const closeChat = () => {
        setShowChat(false);
        setSelectedJizdaId(null);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div>
                <h1>Chat</h1>
                <div className="card">
                    <p>Načítání chatů...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1>Chat</h1>

            {error && (
                <div className="card" style={{ backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div className="card">
                <h3>Aktivní chaty jízd</h3>

                {chaty.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <p>📭 Zatím nemáte žádné aktivní chaty</p>
                        <p>Chaty se vytvoří automaticky když se přidáte do jízdy nebo někdo rezervuje místo ve vaší jízdě.</p>
                    </div>
                ) : (
                    <div className="chat-list">
                        {chaty.map(chat => (
                            <div
                                key={chat.id}
                                className="chat-item"
                                style={{
                                    border: '1px solid var(--card-border)',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    marginBottom: '15px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    backgroundColor: 'var(--card-bg)'
                                }}
                                onClick={() => openChat(chat.jizda_id)}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'var(--card-bg)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color)' }}>
                                            🚗 {chat.jizda?.odkud} → {chat.jizda?.kam}
                                        </h4>
                                        <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            📅 {chat.jizda?.cas_odjezdu ? formatDate(chat.jizda.cas_odjezdu) : 'Datum neurčen'}
                                        </p>
                                        <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            👥 {chat.pocet_ucastniku || 0} účastníků
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            background: 'var(--btn-primary-bg)',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '15px',
                                            fontSize: '12px'
                                        }}>
                                            💬 Otevřít chat
                                        </span>
                                        {chat.posledni_zprava_cas && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                Poslední: {formatDate(chat.posledni_zprava_cas)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-color)' }}>💡 Jak chat funguje:</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        <li>Chat se automaticky vytvoří pro každou jízdu s více účastníky</li>
                        <li>Přístup mají řidič a všichni potvrzení pasažéři</li>
                        <li>Použijte chat pro domluvu detailů jízdy, místa setkání apod.</li>
                        <li>Chaty zůstávají aktivní i po ukončení jízdy pro případné dotazy</li>
                    </ul>
                </div>
            </div>

            {showChat && selectedJizdaId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '600px',
                        height: '80%',
                        position: 'relative'
                    }}>
                        <ChatComponent
                            jizdaId={selectedJizdaId}
                            onClose={closeChat}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
