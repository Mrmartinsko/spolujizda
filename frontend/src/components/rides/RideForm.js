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
            onCarCreated(response.data.auto); // předáme nové auto zpět do RideForm
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

    const [creatingCar, setCreatingCar] = useState(false);
    const [noCars, setNoCars] = useState(false);

    useEffect(() => {
        fetchUserCars();
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            auto_id: formData.auto_id,
            odkud: formData.odkud,
            kam: formData.kam,
            cas_odjezdu: formData.casOdjezdu,
            cas_prijezdu: formData.casPrijezdu,
            cena: formData.cena,
            pocet_mist: formData.pocetMist
        };

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

            alert('Jízda byla úspěšně nabídnuta!');
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
                    {/* Všechny ostatní inputy z původního formuláře */}
                    <div className="form-group">
                        <label>Odkud:</label>
                        <input
                            type="text"
                            name="odkud"
                            value={formData.odkud}
                            onChange={handleChange}
                            required
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
                            placeholder="Cílové místo"
                        />
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
