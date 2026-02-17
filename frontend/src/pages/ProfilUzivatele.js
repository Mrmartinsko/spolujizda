import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PersonalChat from '../components/chat/PersonalChat.js';

const ProfilUzivatele = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [uzivatel, setUzivatel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blocking, setBlocking] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    // 🔥 hodnocení
    const [hodRidic, setHodRidic] = useState({ hodnoceni: [], statistiky: { celkem: 0, prumer: 0, rozdeleni: {} } });
    const [hodPasazer, setHodPasazer] = useState({ hodnoceni: [], statistiky: { celkem: 0, prumer: 0, rozdeleni: {} } });
    const [loadingHod, setLoadingHod] = useState(false);

    // ✅ zobrazit všechny recenze (odděleně pro řidiče/pasažéra)
    const [showAllRidic, setShowAllRidic] = useState(false);
    const [showAllPasazer, setShowAllPasazer] = useState(false);

    // ✅ nepovol zobrazit vlastní profil přes /profil/:id
    useEffect(() => {
        if (user?.id && String(user.id) === String(id)) {
            navigate('/profil', { replace: true });
        }
    }, [user?.id, id, navigate]);

    useEffect(() => {
        const fetchUzivatel = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/uzivatele/${id}`);
                setUzivatel(response.data.uzivatel);
            } catch (error) {
                console.error('Chyba při načítání profilu:', error);
                if (error.response?.status === 403) setError('Nemáte přístup k tomuto profilu');
                else if (error.response?.status === 404) setError('Profil nenalezen');
                else setError('Nepodařilo se načíst profil uživatele');
            } finally {
                setLoading(false);
            }
        };

        fetchUzivatel();
    }, [id]);

    // 🔥 načíst hodnocení pro profil
    useEffect(() => {
        const fetchHodnoceni = async () => {
            try {
                setLoadingHod(true);
                const [rRidic, rPasazer] = await Promise.all([
                    api.get(`/hodnoceni/uzivatel/${id}?role=ridic`),
                    api.get(`/hodnoceni/uzivatel/${id}?role=pasazer`)
                ]);

                setHodRidic(rRidic.data);
                setHodPasazer(rPasazer.data);
            } catch (e) {
                console.error('Chyba při načítání hodnocení:', e);
            } finally {
                setLoadingHod(false);
            }
        };

        if (id) fetchHodnoceni();
    }, [id]);

    const handleBlock = async () => {
        try {
            setBlocking(true);
            setActionError('');
            setActionSuccess('');
            await api.post(`/uzivatele/${id}/blokovat`);
            setActionSuccess('Uživatel byl úspěšně blokován');
        } catch (error) {
            console.error('Chyba při blokování:', error);
            setActionError('Nepodařilo se blokovat uživatele');
        } finally {
            setBlocking(false);
        }
    };

    const handleOpenChat = () => setShowChat(true);
    const handleCloseChat = () => setShowChat(false);

    const renderStars = (value) => {
        const v = Math.round(value || 0);
        return '⭐'.repeat(v) + '☆'.repeat(5 - v);
    };

    const RatingBox = ({ title, data }) => {
        const prumer = data?.statistiky?.prumer || 0;
        const celkem = data?.statistiky?.celkem || 0;

        return (
            <div style={{
                padding: '15px',
                backgroundColor: 'var(--bg-color)',
                borderRadius: '4px',
                textAlign: 'center'
            }}>
                <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-color)' }}>
                    {title}
                </h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {celkem > 0 ? `⭐ ${prumer.toFixed(1)}` : 'Bez hodnocení'}
                </div>
                <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {celkem > 0 ? `${celkem}× hodnocení` : ''}
                </div>
            </div>
        );
    };

    const RatingList = ({ data, showAll, onToggleAll }) => {
        const all = (data?.hodnoceni || []);
        const list = showAll ? all : all.slice(0, 5);

        if (!all.length) return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Zatím žádná hodnocení.</p>;

        return (
            <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {list.map((h) => (
                        <div key={h.id} style={{
                            padding: '12px',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-color)' }}>
                                    {renderStars(h.znamka)} <span style={{ fontWeight: 600 }}>({h.znamka}/5)</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    {h.datum ? new Date(h.datum).toLocaleDateString('cs-CZ') : ''}
                                </div>
                            </div>
                            {h.komentar ? (
                                <div style={{ marginTop: '6px', color: 'var(--text-color)', lineHeight: 1.4 }}>
                                    {h.komentar}
                                </div>
                            ) : (
                                <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                                    (Bez komentáře)
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {all.length > 5 && (
                    <button
                        type="button"
                        onClick={onToggleAll}
                        style={{
                            marginTop: '10px',
                            background: 'none',
                            border: 'none',
                            color: '#1976d2',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0
                        }}
                    >
                        {showAll ? 'Skrýt' : `Zobrazit všechny (${all.length})`}
                    </button>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Načítá se profil...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
                <p>{error}</p>
            </div>
        );
    }

    if (!uzivatel || !uzivatel.profil) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Profil nenalezen</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
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
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
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
                {actionError && <p style={{ color: 'red', marginTop: 0 }}>{actionError}</p>}
                {actionSuccess && <p style={{ color: 'green', marginTop: 0 }}>{actionSuccess}</p>}

                {uzivatel.profil.bio && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--text-color)', marginBottom: '10px' }}>O mně</h3>
                        <p style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
                            {uzivatel.profil.bio}
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <RatingBox title="Hodnocení jako řidič" data={hodRidic} />
                    <RatingBox title="Hodnocení jako pasažér" data={hodPasazer} />
                </div>

                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ color: 'var(--text-color)', marginBottom: '10px' }}>
                        Hodnocení jako řidič {loadingHod ? '(načítám...)' : ''}
                    </h3>
                    <RatingList
                        data={hodRidic}
                        showAll={showAllRidic}
                        onToggleAll={() => setShowAllRidic((p) => !p)}
                    />
                </div>

                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ color: 'var(--text-color)', marginBottom: '10px' }}>
                        Hodnocení jako pasažér {loadingHod ? '(načítám...)' : ''}
                    </h3>
                    <RatingList
                        data={hodPasazer}
                        showAll={showAllPasazer}
                        onToggleAll={() => setShowAllPasazer((p) => !p)}
                    />
                </div>
            </div>

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
