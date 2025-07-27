import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PersonalChat from '../components/chat/PersonalChat';
import UserRatings from '../components/hodnoceni/UserRating';
import AddRatingForm from '../components/hodnoceni/AddRatingForm';

const ProfilUzivatele = () => {
    const { id } = useParams();
    const [uzivatel, setUzivatel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blocking, setBlocking] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [activeRole, setActiveRole] = useState('ridic'); 
    const [reloadRatings, setReloadRatings] = useState(false); 

    useEffect(() => {
        const fetchUzivatel = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/uzivatele/${id}`);
                setUzivatel(response.data.uzivatel);
            } catch (error) {
                console.error('Chyba při načítání profilu:', error);
                if (error.response?.status === 403) {
                    setError('Nemáte přístup k tomuto profilu');
                } else if (error.response?.status === 404) {
                    setError('Profil nenalezen');
                } else {
                    setError('Nepodařilo se načíst profil uživatele');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUzivatel();
    }, [id]);

    const handleBlock = async () => {
        try {
            setBlocking(true);
            await api.post(`/uzivatele/${id}/blokovat`);
            alert('Uživatel byl úspěšně blokován');
        } catch (error) {
            console.error('Chyba při blokování:', error);
            alert('Nepodařilo se blokovat uživatele');
        } finally {
            setBlocking(false);
        }
    };

    const handleOpenChat = () => setShowChat(true);
    const handleCloseChat = () => setShowChat(false);

    const reload = () => setReloadRatings(prev => !prev); // ⬅️ přepínač pro načtení hodnocení znovu

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}><p>Načítá se profil...</p></div>;
    }

    if (error) {
        return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}><p>{error}</p></div>;
    }

    if (!uzivatel || !uzivatel.profil) {
        return <div style={{ padding: '20px', textAlign: 'center' }}><p>Profil nenalezen</p></div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: uzivatel.profil.fotka ? 'transparent' : '#007bff',
                        backgroundImage: uzivatel.profil.fotka ? `url(${uzivatel.profil.fotka})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '32px',
                        fontWeight: 'bold',
                        marginRight: '20px'
                    }}>
                        {!uzivatel.profil.fotka && (uzivatel.profil.jmeno?.charAt(0)?.toUpperCase() || 'U')}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: '0 0 10px 0', color: 'var(--text-color)' }}>
                            {uzivatel.profil.jmeno}
                        </h1>
                        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>
                            Člen od: {new Date(uzivatel.profil.datum_vytvoreni).toLocaleDateString('cs-CZ')}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleOpenChat}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            💬 Napsat zprávu
                        </button>
                        <button
                            onClick={handleBlock}
                            disabled={blocking}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: blocking ? 'not-allowed' : 'pointer',
                                opacity: blocking ? 0.6 : 1
                            }}
                        >
                            {blocking ? 'Blokuje se...' : 'Blokovat uživatele'}
                        </button>
                    </div>
                </div>

                {uzivatel.profil.bio && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--text-color)', marginBottom: '10px' }}>O mně</h3>
                        <p style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>{uzivatel.profil.bio}</p>
                    </div>
                )}
            </div>

            {/* Přepínání mezi rolemi */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveRole('ridic')}
                    style={{
                        marginRight: '10px',
                        padding: '8px 16px',
                        backgroundColor: activeRole === 'ridic' ? '#28a745' : '#e0e0e0',
                        color: activeRole === 'ridic' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Hodnocení jako řidič
                </button>
                <button
                    onClick={() => setActiveRole('pasazer')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: activeRole === 'pasazer' ? '#28a745' : '#e0e0e0',
                        color: activeRole === 'pasazer' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Hodnocení jako pasažér
                </button>
            </div>

            {/* Hodnocení a formulář */}
            <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '8px' }}>
                <UserRatings uzivatelId={parseInt(id)} role={activeRole} key={reloadRatings + activeRole} />
                <hr style={{ margin: '20px 0' }} />
                <AddRatingForm
                    cilovyUzivatelId={parseInt(id)}
                    role={activeRole}
                    onSuccess={reload}
                />
            </div>

            {/* Chat */}
            {showChat && (
                <PersonalChat
                    otherUserId={parseInt(id)}
                    otherUserName={uzivatel.profil.jmeno}
                    onClose={handleCloseChat}
                />
            )}
        </div>
    );
};

export default ProfilUzivatele;
