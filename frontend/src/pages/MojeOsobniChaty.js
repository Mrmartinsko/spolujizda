import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `dnes ${time}`;
    if (isYesterday) return `včera ${time}`;
    return date.toLocaleDateString('cs-CZ') + ' ' + time;
};

const MojeOsobniChaty = () => {
    const { token, user } = useAuth();
    const [chaty, setChaty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChaty = async () => {
            try {
                const response = await api.get('/chat/moje', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChaty(response.data.osobni_chaty);
            } catch (err) {
                console.error(err);
                setError('Nepodařilo se načíst osobní chaty');
            } finally {
                setLoading(false);
            }
        };
        fetchChaty();
    }, [token]);

    const handleOpenChat = (chat) => {
        const druhyUzivatel = chat.ucastnici?.find(u => u.id !== user.id);
        if (!druhyUzivatel) {
            alert("Chyba: nelze otevřít chat, chybí uživatel");
            return;
        }
        navigate(`/chat/${druhyUzivatel.id}`);
    };

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation(); // zabrání volání handleOpenChat při kliknutí na křížek
        if (!window.confirm("Opravdu chcete smazat tento chat?")) return;

        try {
            await api.delete(`/chat/osobni/${chatId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChaty(prev => prev.filter(c => c.id !== chatId));
        } catch (err) {
            console.error(err);
            alert("Nepodařilo se smazat chat");
        }
    };

    if (loading) return <p>Načítají se osobní chaty...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Moje osobní chaty</h2>
            {chaty.length === 0 ? (
                <p>Zatím nemáte žádné osobní chaty.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {chaty.map(chat => {
                        const druhyUzivatel = chat.ucastnici.find(u => u.id !== user.id);
                        const posledniZprava = chat.posledni_zprava;

                        return (
                            <li
                                key={chat.id}
                                style={{
                                    border: '1px solid #ccc',
                                    borderRadius: '5px',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onClick={() => handleOpenChat(chat)}
                            >
                                <div>
                                    <strong>{druhyUzivatel?.profil?.jmeno || druhyUzivatel?.email || "Neznámý"}</strong>
                                    {posledniZprava && (
                                        <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '0.9rem' }}>
                                            {posledniZprava?.odesilatel?.jmeno
                                                ? `${posledniZprava.odesilatel.jmeno}: ${
                                                    posledniZprava.text.length > 30
                                                        ? posledniZprava.text.substring(0, 30) + '...'
                                                        : posledniZprava.text
                                                }`
                                                : `Neznámý: ${posledniZprava?.text || ""}`
                                            }
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {posledniZprava && (
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                            {formatTime(posledniZprava.cas)}
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => handleDeleteChat(chat.id, e)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'red',
                                            fontSize: '1.2rem',
                                            cursor: 'pointer'
                                        }}
                                        title="Smazat chat"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default MojeOsobniChaty;
