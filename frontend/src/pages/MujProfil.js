import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import CarManager from '../components/cars/CarManager';
import './MujProfil.css';

const MujProfil = () => {
    const { user, setUser } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [hodRidic, setHodRidic] = useState({ statistiky: { celkem: 0, prumer: 0 } });
    const [hodPasazer, setHodPasazer] = useState({ statistiky: { celkem: 0, prumer: 0 } });

    const [formData, setFormData] = useState({
        jmeno: user?.profil?.jmeno || '',
        bio: user?.profil?.bio || ''
    });

    useEffect(() => {
        setFormData({
            jmeno: user?.profil?.jmeno || '',
            bio: user?.profil?.bio || ''
        });
    }, [user]);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                if (!user?.id) return;
                const token = localStorage.getItem('token');

                const [rRidic, rPasazer] = await Promise.all([
                    axios.get(`http://localhost:5000/api/hodnoceni/uzivatel/${user.id}?role=ridic`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:5000/api/hodnoceni/uzivatel/${user.id}?role=pasazer`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                ]);

                setHodRidic(rRidic.data);
                setHodPasazer(rPasazer.data);
            } catch (e) {
                console.error('Chyba při načítání hodnocení:', e);
            }
        };

        fetchRatings();
    }, [user?.id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditClick = () => {
        setFormData({
            jmeno: user?.profil?.jmeno || '',
            bio: user?.profil?.bio || ''
        });
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setFormData({
            jmeno: user?.profil?.jmeno || '',
            bio: user?.profil?.bio || ''
        });
        setError('');
        setSuccess('');
    };

    const handleSaveChanges = async () => {
        const trimmedJmeno = (formData.jmeno || '').trim();
        if (!trimmedJmeno) {
            setError('Uživatelské jméno je povinné.');
            return;
        }
        if (trimmedJmeno.length > 20) {
            setError('Uživatelské jméno může mít maximálně 20 znaků.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                jmeno: trimmedJmeno
            };

            const response = await axios.put(
                'http://localhost:5000/api/uzivatele/profil',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.uzivatel) {
                setUser(response.data.uzivatel);
                setEditMode(false);
                setSuccess('Profil byl úspěšně aktualizován.');
            }
        } catch (saveError) {
            console.error('Chyba při aktualizaci profilu:', saveError);
            setError(saveError.response?.data?.error || 'Chyba při aktualizaci profilu.');
        } finally {
            setLoading(false);
        }
    };

    const prumerRidic = hodRidic?.statistiky?.prumer || 0;
    const prumerPasazer = hodPasazer?.statistiky?.prumer || 0;
    const celkemRidic = hodRidic?.statistiky?.celkem || 0;
    const celkemPasazer = hodPasazer?.statistiky?.celkem || 0;

    return (
        <div className="muj-profil-page">
            <h1 className="muj-profil-title">Můj profil</h1>
            <div className="card muj-profil-card">
                <h3>Základní informace</h3>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                {user?.profil ? (
                    <div>
                        {editMode ? (
                            <div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label><strong>Uživatelské jméno:</strong></label>
                                    <input
                                        type="text"
                                        name="jmeno"
                                        value={formData.jmeno}
                                        onChange={handleInputChange}
                                        className="form-control"
                                        style={{ marginTop: '5px' }}
                                        maxLength={20}
                                    />
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label><strong>Email:</strong></label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="form-control"
                                        style={{ marginTop: '5px', backgroundColor: '#f5f5f5' }}
                                    />
                                    <small style={{ color: '#666' }}>Email nelze změnit</small>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label><strong>Bio:</strong></label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        className="form-control"
                                        rows="3"
                                        style={{ marginTop: '5px' }}
                                        placeholder="Napište něco o sobě..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p><strong>Uživatelské jméno:</strong> {user.profil.jmeno}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Bio:</strong> {user.profil.bio || 'Není vyplněno'}</p>

                                <p>
                                    <strong>Hodnocení jako řidič:</strong>{' '}
                                    {celkemRidic > 0 ? `★ ${prumerRidic.toFixed(1)} (${celkemRidic}×)` : 'Bez hodnocení'}
                                </p>
                                <p>
                                    <strong>Hodnocení jako pasažér:</strong>{' '}
                                    {celkemPasazer > 0 ? `★ ${prumerPasazer.toFixed(1)} (${celkemPasazer}×)` : 'Bez hodnocení'}
                                </p>

                                <p><strong>Počet aut:</strong> {user.profil.pocet_aut || 0}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p>Profil nenalezen</p>
                )}

                <div className="muj-profil-actions">
                    {editMode ? (
                        <>
                            <button
                                className="btn btn-success"
                                style={{ marginRight: '10px' }}
                                onClick={handleSaveChanges}
                                disabled={loading}
                            >
                                {loading ? 'Ukládám...' : 'Uložit změny'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCancelEdit}
                                disabled={loading}
                            >
                                Zrušit
                            </button>
                        </>
                    ) : (
                        <button
                            className="btn btn-primary"
                            style={{ marginRight: '10px' }}
                            onClick={handleEditClick}
                        >
                            Upravit profil
                        </button>
                    )}
                </div>
            </div>

            <CarManager />
        </div>
    );
};

export default MujProfil;
