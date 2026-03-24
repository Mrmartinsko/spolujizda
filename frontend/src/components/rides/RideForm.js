import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LocationAutocompleteInput from './LocationAutocompleteInput';
import './RideForm.css';

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
        const { name, value } = e.target;
        setCarData(prev => ({ ...prev, [name]: value }));
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
            setError(err.response?.data?.error || 'Chyba pri vytvareni auta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="car-form">
            <h3>Vytvorit auto</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Znacka:</label>
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
                <button type="submit" disabled={loading}>
                    {loading ? 'Vytvari se...' : 'Vytvorit auto'}
                </button>
                <button type="button" onClick={onCancel} disabled={loading}>
                    Zrusit
                </button>
            </form>
        </div>
    );
};

const emptyLocationMeta = {
    text: '',
    place_id: null,
    address: '',
};

const createStop = (text = '', meta = null) => ({
    text,
    place_id: meta?.place_id || null,
    address: meta?.address || '',
});

const RideForm = ({ onRideCreated }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        odkud: '',
        odkud_place_id: null,
        odkud_address: '',
        kam: '',
        kam_place_id: null,
        kam_address: '',
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
    const [mezistanice, setMezistanice] = useState([]);
    const [novaMezistanice, setNovaMezistanice] = useState(emptyLocationMeta);

    const validateLocationField = (value, fieldLabel) => {
        const normalized = (value || '').trim();
        if (!normalized) {
            return `${fieldLabel} je povinne`;
        }
        if (normalized.length > 50) {
            return `${fieldLabel} muze mit maximalne 50 znaku`;
        }
        if (/[^\p{L}\p{N}\s-]/gu.test(normalized)) {
            return `${fieldLabel} muze obsahovat jen pismena, cisla, mezery a pomlcky`;
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
            console.error('Chyba pri nacitani aut:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationChange = (fieldName, value, meta) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value,
            [`${fieldName}_place_id`]: meta?.place_id || null,
            [`${fieldName}_address`]: meta?.address || '',
        }));
    };

    const handleNovaMezistaniceChange = (_, value, meta) => {
        setNovaMezistanice(createStop(value, meta));
    };

    const pridatMezistanici = () => {
        const value = novaMezistanice.text.trim();
        if (!value) {
            return;
        }

        const locationError = validateLocationField(value, 'Mezistanice');
        if (locationError) {
            setError(locationError);
            return;
        }

        if (mezistanice.some((m) => (m.place_id && novaMezistanice.place_id ? m.place_id === novaMezistanice.place_id : m.text.toLowerCase() === value.toLowerCase()))) {
            setNovaMezistanice(emptyLocationMeta);
            return;
        }

        setMezistanice(prev => [...prev, createStop(value, novaMezistanice)]);
        setNovaMezistanice(emptyLocationMeta);
        setError('');
    };

    const smazatMezistanici = (index) => {
        setMezistanice(prev => prev.filter((_, i) => i !== index));
    };

    const posunNahoru = (index) => {
        if (index === 0) {
            return;
        }
        setMezistanice(prev => {
            const copy = [...prev];
            [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
            return copy;
        });
    };

    const posunDolu = (index) => {
        setMezistanice(prev => {
            if (index >= prev.length - 1) {
                return prev;
            }
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

        const odkudError = validateLocationField(formData.odkud, 'Odkud');
        if (odkudError) {
            setError(odkudError);
            setLoading(false);
            return;
        }

        const kamError = validateLocationField(formData.kam, 'Kam');
        if (kamError) {
            setError(kamError);
            setLoading(false);
            return;
        }

        for (const stop of mezistanice) {
            const stopError = validateLocationField(stop.text, 'Mezistanice');
            if (stopError) {
                setError(stopError);
                setLoading(false);
                return;
            }
        }

        const payload = {
            auto_id: formData.auto_id,
            odkud: formData.odkud,
            odkud_place_id: formData.odkud_place_id,
            odkud_address: formData.odkud_address,
            kam: formData.kam,
            kam_place_id: formData.kam_place_id,
            kam_address: formData.kam_address,
            mezistanice: mezistanice.map((stop) => ({
                text: stop.text,
                place_id: stop.place_id,
                address: stop.address,
            })),
            cas_odjezdu: formData.casOdjezdu,
            cas_prijezdu: formData.casPrijezdu,
            cena: formData.cena,
            pocet_mist: formData.pocetMist
        };

        if (payload.mezistanice.length === 0) {
            delete payload.mezistanice;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/jizdy/', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (onRideCreated) {
                onRideCreated(response.data);
            }

            setFormData({
                odkud: '',
                odkud_place_id: null,
                odkud_address: '',
                kam: '',
                kam_place_id: null,
                kam_address: '',
                casOdjezdu: '',
                casPrijezdu: '',
                cena: '',
                pocetMist: 1,
                auto_id: ''
            });
            setMezistanice([]);
            setNovaMezistanice(emptyLocationMeta);
            setSuccess('Jizda byla uspesne nabidnuta.');
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba pri vytvareni jizdy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ride-form">
            <h2>Nabidnout jizdu</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {noCars && !creatingCar && (
                <div className="no-cars">
                    <p>Nemate vytvorene zadne auto.</p>
                    <button type="button" onClick={() => setCreatingCar(true)}>
                        Vytvorit auto
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
                    <LocationAutocompleteInput
                        label="Odkud:"
                        name="odkud"
                        value={formData.odkud}
                        onChange={handleLocationChange}
                        required
                        placeholder="Vychozi mesto"
                    />

                    <LocationAutocompleteInput
                        label="Kam:"
                        name="kam"
                        value={formData.kam}
                        onChange={handleLocationChange}
                        required
                        placeholder="Cilove mesto"
                    />

                    <div className="form-group">
                        <label>Mezistanice (nepovinne):</label>

                        <div className="mezistanice-row">
                            <LocationAutocompleteInput
                                name="novaMezistanice"
                                value={novaMezistanice.text}
                                onChange={handleNovaMezistaniceChange}
                                hideLabel
                                wrapperClassName="mezistanice-autocomplete"
                                placeholder="Napr. Jihlava"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        pridatMezistanici();
                                    }
                                }}
                            />
                            <button type="button" className="mezistanice-add" onClick={pridatMezistanici}>
                                Pridat
                            </button>
                        </div>

                        {mezistanice.length > 0 && (
                            <ul className="mezistanice-list">
                                {mezistanice.map((m, i) => (
                                    <li key={`${m.place_id || m.text}-${i}`} className="mezistanice-item">
                                        <span className="mezistanice-index">{i + 1}.</span>
                                        <span className="mezistanice-text">{m.text}</span>
                                        <div className="mezistanice-actions">
                                            <button
                                                type="button"
                                                onClick={() => posunNahoru(i)}
                                                disabled={i === 0}
                                                title="Posunout nahoru"
                                            >
                                                Nahoru
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => posunDolu(i)}
                                                disabled={i === mezistanice.length - 1}
                                                title="Posunout dolu"
                                            >
                                                Dolu
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
                        <label>Cas odjezdu:</label>
                        <input
                            type="datetime-local"
                            name="casOdjezdu"
                            value={formData.casOdjezdu}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Cas prijezdu:</label>
                        <input
                            type="datetime-local"
                            name="casPrijezdu"
                            value={formData.casPrijezdu}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Cena (Kc):</label>
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
                        <label>Pocet mist:</label>
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
                            {auta.map((auto) => (
                                <option key={auto.id} value={auto.id}>
                                    {auto.znacka} {auto.model} ({auto.spz})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Vytvari se...' : 'Nabidnout jizdu'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default RideForm;
