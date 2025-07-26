import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatComponent from '../components/chat/Chat';
import axios from 'axios';

const JizdaChat = () => {
    const { token, user } = useAuth();
    const [chaty, setChaty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedJizdaId, setSelectedJizdaId] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [filter, setFilter] = useState('all'); // all, current, past

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

    const getFilteredChaty = () => {
        const now = new Date();
        return chaty.filter(chat => {
            if (filter === 'all') return true;
            if (!chat.jizda?.cas_odjezdu) return filter === 'current';

            const jizdaDate = new Date(chat.jizda.cas_odjezdu);
            if (filter === 'current') return jizdaDate >= now;
            if (filter === 'past') return jizdaDate < now;
            return true;
        });
    };

    if (loading) {
        return (
            <div>
                <h1>Chat jízd</h1>
                <div className="card">
                    <p>Načítání chatů...</p>
                </div>
            </div>
        );
    }

    const filteredChaty = getFilteredChaty();

    return (
        <div>
            <h1>Chat jízd</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Komunikujte s ostatními účastníky svých jízd
            </p>

            {error && (
                <div className="card" style={{ backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Chaty jízd</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setFilter('all')}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid var(--card-border)',
                                borderRadius: '4px',
                                backgroundColor: filter === 'all' ? 'var(--btn-primary-bg)' : 'var(--card-bg)',
                                color: filter === 'all' ? 'white' : 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Všechny
                        </button>
                        <button
                            onClick={() => setFilter('current')}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid var(--card-border)',
                                borderRadius: '4px',
                                backgroundColor: filter === 'current' ? 'var(--btn-primary-bg)' : 'var(--card-bg)',
                                color: filter === 'current' ? 'white' : 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Aktuální
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid var(--card-border)',
                                borderRadius: '4px',
                                backgroundColor: filter === 'past' ? 'var(--btn-primary-bg)' : 'var(--card-bg)',
                                color: filter === 'past' ? 'white' : 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Minulé
                        </button>
                    </div>
                </div>

                {filteredChaty.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <p>📭 {filter === 'all' ? 'Zatím nemáte žádné chaty jízd' : `Žádné ${filter === 'current' ? 'aktuální' : 'minulé'} chaty`}</p>
                        <p>Chaty se vytvoří automaticky když se přidáte do jízdy nebo někdo rezervuje místo ve vaší jízdě.</p>
                    </div>
                ) : (
                    <div className="chat-list">
                        {filteredChaty.map(chat => {
                            const isUpcoming = chat.jizda?.cas_odjezdu && new Date(chat.jizda.cas_odjezdu) >= new Date();

                            return (
                                <div
                                    key={chat.id}
                                    className="chat-item"
                                    style={{
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginBottom: '15px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        backgroundColor: 'var(--card-bg)',
                                        opacity: isUpcoming ? 1 : 0.8
                                    }}
                                    onClick={() => openChat(chat.jizda_id)}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <h4 style={{ margin: 0, color: 'var(--text-color)' }}>
                                                    🚗 {chat.jizda?.odkud} → {chat.jizda?.kam}
                                                </h4>
                                                {!isUpcoming && (
                                                    <span style={{
                                                        background: '#6c757d',
                                                        color: 'white',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        fontSize: '10px'
                                                    }}>
                                                        UKONČENÁ
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                📅 {chat.jizda?.cas_odjezdu ? formatDate(chat.jizda.cas_odjezdu) : 'Datum neurčen'}
                                            </p>
                                            <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                <span>👥 {chat.pocet_ucastniku || 0} účastníků</span>
                                                {chat.jizda?.ridic && (
                                                    <span>🚗 Řidič: {chat.jizda.ridic.profil?.jmeno || 'Neznámý'}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                background: isUpcoming ? 'var(--btn-primary-bg)' : '#6c757d',
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
                            );
                        })}
                    </div>
                )}

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-color)' }}>💡 Jak chat jízd funguje:</h4>
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

export default JizdaChat;
