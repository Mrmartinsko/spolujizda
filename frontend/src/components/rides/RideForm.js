import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideForm.css';

// Jednoduchý inline formulář pro vytvoření auta
const CarForm = ({ token, onCarCreated, onCancel }) => {
    const [carData, setCarData] = useState({
        znacka: '',
        model: '',
        barva: '',
        spz: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setCarData({ ...carData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                'http://localhost:5000/api/auta/moje-nove',
                carData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onCarCreated(response.data.auto);
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vytváření auta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="car-form">
            <h3>Vytvořit auto</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Značka:</label>
                    <input type="text" name="znacka" value={carData.znacka} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Model:</label>
                    <input type="text" name="model" value={carData.model} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Barva:</label>
                    <input type="text" name="barva" value={carData.barva} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>SPZ:</label>
                    <input type="text" name="spz" value={carData.spz} onChange={handleChange} />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Vytváří se...' : 'Vytvořit auto'}</button>
                <button type="button" onClick={onCancel} disabled={loading}>Zrušit</button>
            </form>
        </div>
    );
};

const RideForm = ({ onRideCreated }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        odkud: '',
        kam: '',
        casOdjezdu: '',
        casPrijezdu: '',
        cena: '',
        pocetMist: 1,
        auto_id: ''
    });
    const [auta, setAuta] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [creatingCar, setCreatingCar] = useState(false);
    const [noCars, setNoCars] = useState(false);

    // mezistanice
    const [mezistanice, setMezistanice] = useState([]);
    const [novaMezistanice, setNovaMezistanice] = useState("");

    const validateLocationField = (value, fieldLabel) => {
        const normalized = (value || "").trim();
        if (!normalized) {
            return `${fieldLabel} je povinné`;
        }
        if (normalized.length > 15) {
            return `${fieldLabel} může mít maximálně 15 znaků`;
        }
        if (/[^A-Za-zÀ-ž0-9\s-]/.test(normalized)) {
            return `${fieldLabel} může obsahovat jen písmena a maximálně dvě čísla`;
        }
        const digitsCount = (normalized.match(/\d/g) || []).length;
        if (digitsCount > 2) {
            return `${fieldLabel} může obsahovat maximálně dvě čísla`;
        }
        return null;
    };

    useEffect(() => {
        fetchUserCars();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUserCars = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/auta/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userCars = response.data || [];
            setAuta(userCars);

            if (userCars.length === 0) {
                setNoCars(true);
            } else {
                setFormData(prev => ({
                    ...prev,
                    auto_id: userCars.find(car => car.primarni)?.id || userCars[0].id
                }));
                setNoCars(false);
            }
        } catch (err) {
            console.error('Chyba při načítání aut:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === "odkud" || name === "kam") && value.length > 15) return;
        setFormData({ ...formData, [name]: value });
    };

    const pridatMezistanici = () => {
        const value = novaMezistanice.trim();
        if (!value) return;

        const locationError = validateLocationField(value, "Mezistanice");
        if (locationError) {
            setError(locationError);
            return;
        }

        // zákaz duplicit (můžeš smazat, pokud nechceš)
        if (mezistanice.some(m => m.toLowerCase() === value.toLowerCase())) {
            setNovaMezistanice("");
            return;
        }

        setMezistanice(prev => [...prev, value]);
        setNovaMezistanice("");
        setError("");
    };

    const smazatMezistanici = (index) => {
        setMezistanice(prev => prev.filter((_, i) => i !== index));
    };

    const posunNahoru = (index) => {
        if (index === 0) return;
        setMezistanice(prev => {
            const copy = [...prev];
            [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
            return copy;
        });
    };

    const posunDolu = (index) => {
        setMezistanice(prev => {
            if (index >= prev.length - 1) return prev;
            const copy = [...prev];
            [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
            return copy;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const odkudError = validateLocationField(formData.odkud, "Odkud");
        if (odkudError) {
            setError(odkudError);
            setLoading(false);
            return;
        }

        const kamError = validateLocationField(formData.kam, "Kam");
        if (kamError) {
            setError(kamError);
            setLoading(false);
            return;
        }

        for (const stop of mezistanice) {
            const stopError = validateLocationField(stop, "Mezistanice");
            if (stopError) {
                setError(stopError);
                setLoading(false);
                return;
            }
        }

        const payload = {
            auto_id: formData.auto_id,
            odkud: formData.odkud,
            kam: formData.kam,
            mezistanice: mezistanice, // <-- tady
            cas_odjezdu: formData.casOdjezdu,
            cas_prijezdu: formData.casPrijezdu,
            cena: formData.cena,
            pocet_mist: formData.pocetMist
        };

        // volitelné: neposílat prázdné pole
        if (!payload.mezistanice || payload.mezistanice.length === 0) {
            delete payload.mezistanice;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/jizdy/', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (onRideCreated) onRideCreated(response.data);

            setFormData({
                odkud: '',
                kam: '',
                casOdjezdu: '',
                casPrijezdu: '',
                cena: '',
                pocetMist: 1,
                auto_id: ''
            });

            setMezistanice([]);
            setNovaMezistanice("");

            setSuccess('Jízda byla úspěšně nabídnuta!');
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vytváření jízdy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ride-form">
            <h2>Nabídnout jízdu</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {noCars && !creatingCar && (
                <div className="no-cars">
                    <p>Nemáte vytvořené žádné auto.</p>
                    <button type="button" onClick={() => setCreatingCar(true)}>
                        Vytvořit auto
                    </button>
                </div>
            )}

            {creatingCar && (
                <CarForm
                    token={token}
                    onCarCreated={(newCar) => {
                        setAuta(prev => [...prev, newCar]);
                        setFormData(prev => ({ ...prev, auto_id: newCar.id }));
                        setCreatingCar(false);
                        setNoCars(false);
                    }}
                    onCancel={() => setCreatingCar(false)}
                />
            )}

            {!creatingCar && (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Odkud:</label>
                        <input
                            type="text"
                            name="odkud"
                            value={formData.odkud}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            placeholder="Výchozí místo"
                        />
                    </div>

                    <div className="form-group">
                        <label>Kam:</label>
                        <input
                            type="text"
                            name="kam"
                            value={formData.kam}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            placeholder="Cílové místo"
                        />
                    </div>

                    {/* Mezistanice */}
                    <div className="form-group">
                        <label>Mezistanice (nepovinné):</label>

                        <div className="mezistanice-row">
                            <input
                                type="text"
                                value={novaMezistanice}
                                onChange={(e) => setNovaMezistanice(e.target.value)}
                                maxLength={15}
                                placeholder="Např. Jihlava"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        pridatMezistanici();
                                    }
                                }}
                            />
                            <button type="button" className="mezistanice-add" onClick={pridatMezistanici}>
                                Přidat
                            </button>
                        </div>

                        {mezistanice.length > 0 && (
                            <ul className="mezistanice-list">
                                {mezistanice.map((m, i) => (
                                    <li key={`${m}-${i}`} className="mezistanice-item">
                                        <span className="mezistanice-index">{i + 1}.</span>
                                        <span className="mezistanice-text">{m}</span>
                                        <div className="mezistanice-actions">
                                            <button
                                                type="button"
                                                onClick={() => posunNahoru(i)}
                                                disabled={i === 0}
                                                title="Posunout nahoru"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => posunDolu(i)}
                                                disabled={i === mezistanice.length - 1}
                                                title="Posunout dolů"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => smazatMezistanici(i)}
                                                title="Smazat"
                                            >
                                                Smazat
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Čas odjezdu:</label>
                        <input
                            type="datetime-local"
                            name="casOdjezdu"
                            value={formData.casOdjezdu}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Čas příjezdu:</label>
                        <input
                            type="datetime-local"
                            name="casPrijezdu"
                            value={formData.casPrijezdu}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Cena (Kč):</label>
                        <input
                            type="number"
                            name="cena"
                            value={formData.cena}
                            onChange={handleChange}
                            required
                            min="0"
                            step="10"
                        />
                    </div>

                    <div className="form-group">
                        <label>Počet míst:</label>
                        <input
                            type="number"
                            name="pocetMist"
                            value={formData.pocetMist}
                            onChange={handleChange}
                            required
                            min="1"
                            max="8"
                        />
                    </div>

                    <div className="form-group">
                        <label>Auto:</label>
                        <select
                            name="auto_id"
                            value={formData.auto_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Vyberte auto</option>
                            {auta.map(auto => (
                                <option key={auto.id} value={auto.id}>
                                    {auto.znacka} {auto.model} ({auto.spz})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Vytváří se...' : 'Nabídnout jízdu'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default RideForm;
