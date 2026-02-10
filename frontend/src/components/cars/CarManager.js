import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './CarManager.css';
import ReplaceCar from '../cars/ReplaceCar'; // modal pro nahrazení auta

const CarManager = () => {
    const { token } = useAuth();
    const [auta, setAuta] = useState([]);
    const [formData, setFormData] = useState({
        znacka: '',
        model: '',
        barva: '',
        spz: '',
        primarni: false
    });
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showReplaceCar, setShowReplaceCar] = useState({ active: false, autoId: null });

    useEffect(() => {
        fetchAuta();
    }, []);

    const fetchAuta = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/auta/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAuta(response.data);
        } catch (err) {
            setError('Chyba při načítání aut');
        }
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({
            ...formData,
            [e.target.name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (editing) {
                await axios.put(`http://localhost:5000/api/auta/${editing}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/auta/moje-nove', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setFormData({
                znacka: '',
                model: '',
                barva: '',
                spz: '',
                primarni: false
            });
            setEditing(null);
            fetchAuta();
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při ukládání auta');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (auto) => {
        setFormData({
            znacka: auto.znacka,
            model: auto.model,
            barva: auto.barva,
            spz: auto.spz,
            primarni: auto.primarni
        });
        setEditing(auto.id);
    };

    const handleDelete = async (autoId) => {
        if (window.confirm('Opravdu chcete smazat toto auto?')) {
            try {
                await axios.delete(`http://localhost:5000/api/auta/${autoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchAuta();
            } catch (err) {
                const errorCode = err.response?.status;
                const errorData = err.response?.data;

                if (errorCode === 409 && errorData?.error === "AUTO_MA_AKTIVNI_JIZDY") {
                    // Otevřít modal ReplaceCar
                    setShowReplaceCar({ active: true, autoId });
                } else {
                    setError(errorData?.error || 'Chyba při mazání auta');
                }
            }
        }
    };

    const cancelEdit = () => {
        setFormData({
            znacka: '',
            model: '',
            barva: '',
            spz: '',
            primarni: false
        });
        setEditing(null);
    };

    return (
        <div className="car-manager">
            <h1>Moje auta</h1>
            <div className="car-list">
                {auta.length === 0 ? (
                    <p>Zatím nemáte žádné auto přidané.</p>
                ) : (
                    <div className="cars-grid">
                        {auta.map(auto => (
                            <div key={auto.id} className="car-card">
                                <div className="car-header">
                                    <h4>{auto.znacka} {auto.model}</h4>
                                    {auto.primarni && <span className="primary-badge">Primární</span>}
                                </div>
                                <div className="car-details">
                                    <p><strong>Barva:</strong> {auto.barva}</p>
                                    {auto.spz && <p><strong>SPZ:</strong> {auto.spz}</p>}
                                </div>
                                <div className="car-actions">
                                    <button onClick={() => handleEdit(auto)}>Upravit</button>
                                    <button onClick={() => handleDelete(auto.id)}>Smazat</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <h2>Správa aut</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="car-form">
                <h3>{editing ? 'Upravit auto' : 'Přidat nové auto'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Značka:</label>
                            <input
                                type="text"
                                name="znacka"
                                value={formData.znacka}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Model:</label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Barva:</label>
                            <input
                                type="text"
                                name="barva"
                                value={formData.barva}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>SPZ:</label>
                            <input
                                type="text"
                                name="spz"
                                value={formData.spz}
                                onChange={handleChange}
                                placeholder="např. 1A2 3456"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="primarni"
                                checked={formData.primarni}
                                onChange={handleChange}
                            />
                            Primární auto
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="submit" disabled={loading}>
                            {loading ? 'Ukládá se...' : (editing ? 'Upravit' : 'Přidat')}
                        </button>
                        {editing && (
                            <button type="button" onClick={cancelEdit}>
                                Zrušit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ReplaceCar modal */}
            {showReplaceCar.active && (
                <ReplaceCar
                    autoId={showReplaceCar.autoId}
                    onClose={() => setShowReplaceCar({ active: false, autoId: null })}
                    onCarReplaced={() => {
                        setShowReplaceCar({ active: false, autoId: null });
                        fetchAuta();
                    }}
                />
            )}
        </div>
    );
};

export default CarManager;
