import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ProfilUzivatele = () => {
    const { id } = useParams();
    const [uzivatel, setUzivatel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blocking, setBlocking] = useState(false);

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
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
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
                    <div>
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
                        <p style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
                            {uzivatel.profil.bio}
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{
                        padding: '15px',
                        backgroundColor: 'var(--bg-color)',
                        borderRadius: '4px',
                        textAlign: 'center'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-color)' }}>
                            Hodnocení jako řidič
                        </h4>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                            {uzivatel.profil.get_prumerne_hodnoceni?.('ridic') ?
                                `⭐ ${uzivatel.profil.get_prumerne_hodnoceni('ridic').toFixed(1)}` :
                                'Bez hodnocení'
                            }
                        </div>
                    </div>
                    <div style={{
                        padding: '15px',
                        backgroundColor: 'var(--bg-color)',
                        borderRadius: '4px',
                        textAlign: 'center'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-color)' }}>
                            Hodnocení jako pasažér
                        </h4>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                            {uzivatel.profil.get_prumerne_hodnoceni?.('pasazer') ?
                                `⭐ ${uzivatel.profil.get_prumerne_hodnoceni('pasazer').toFixed(1)}` :
                                'Bez hodnocení'
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilUzivatele;
