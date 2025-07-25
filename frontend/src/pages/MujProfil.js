import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const MujProfil = () => {
    const { user, setUser } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        jmeno: user?.profil?.jmeno || '',
        bio: user?.profil?.bio || ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                'http://localhost:5000/api/uzivatele/profil',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.uzivatel) {
                setUser(response.data.uzivatel);
                setEditMode(false);
                alert('Profil byl úspěšně aktualizován!');
            }
        } catch (error) {
            console.error('Chyba při aktualizaci profilu:', error);
            alert('Chyba při aktualizaci profilu: ' + (error.response?.data?.error || 'Neznámá chyba'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Můj profil</h1>
            <div className="card">
                <h3>Základní informace</h3>
                {user?.profil ? (
                    <div>
                        {editMode ? (
                            <div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label><strong>Jméno:</strong></label>
                                    <input
                                        type="text"
                                        name="jmeno"
                                        value={formData.jmeno}
                                        onChange={handleInputChange}
                                        className="form-control"
                                        style={{ marginTop: '5px' }}
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
                                <p><strong>Jméno:</strong> {user.profil.jmeno}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Bio:</strong> {user.profil.bio || 'Není vyplněno'}</p>
                                <p><strong>Hodnocení jako řidič:</strong> {user.profil.hodnoceni_ridic || 0}/5</p>
                                <p><strong>Hodnocení jako pasažér:</strong> {user.profil.hodnoceni_pasazer || 0}/5</p>
                                <p><strong>Počet aut:</strong> {user.profil.pocet_aut || 0}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p>Profil nenalezen</p>
                )}

                <div style={{ marginTop: '20px' }}>
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
                        <>
                            <button
                                className="btn btn-primary"
                                style={{ marginRight: '10px' }}
                                onClick={handleEditClick}
                            >
                                Upravit profil
                            </button>
                            <button className="btn btn-secondary">
                                Spravovat auta
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MujProfil;
