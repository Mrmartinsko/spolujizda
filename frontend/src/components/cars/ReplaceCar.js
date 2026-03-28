import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './ReplaceCar.css';

const ReplaceCar = ({ autoId, aktivniJizdyCount = 0, onClose, onCarReplaced }) => {
    const { token } = useAuth();
    const [availableCars, setAvailableCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newCar, setNewCar] = useState({ znacka: '', model: '', spz: '', barva: '' });
    const [adding, setAdding] = useState(false);
    const [cancellingRides, setCancellingRides] = useState(false);

    useEffect(() => {
        const fetchAvailableCars = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get('http://localhost:5000/api/auta/moje', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const filteredCars = response.data.filter(auto => auto.id !== autoId);
                setAvailableCars(filteredCars);
            } catch (err) {
                console.error('Chyba pri nacitani dostupnych aut:', err);
                setError(err.response?.data?.message || 'Chyba pri nacitani aut');
                setAvailableCars([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailableCars();
    }, [token, autoId]);

    const replaceCar = async (newAutoId) => {
        setError('');
        try {
            await axios.post(
                `http://localhost:5000/api/auta/replace/${autoId}`,
                { nove_auto_id: newAutoId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (onCarReplaced) onCarReplaced();
            onClose();
        } catch (err) {
            console.error('Chyba pri nahrazovani auta:', err);
            setError(err.response?.data?.message || 'Chyba pri nahrazovani auta');
        }
    };

    const addNewCar = async () => {
        if (!newCar.znacka || !newCar.model) {
            setError('Znacka a model jsou povinne.');
            return;
        }

        setAdding(true);
        setError('');

        try {
            const response = await axios.post(
                'http://localhost:5000/api/auta/moje-nove',
                newCar,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAvailableCars(prev => [...prev, response.data.auto]);
            setNewCar({ znacka: '', model: '', spz: '', barva: '' });
        } catch (err) {
            console.error('Chyba pri pridavani auta:', err);
            setError(err.response?.data?.message || 'Chyba pri pridavani auta');
        } finally {
            setAdding(false);
        }
    };

    const cancelActiveRides = async () => {
        setCancellingRides(true);
        setError('');

        try {
            await axios.post(
                `http://localhost:5000/api/auta/${autoId}/zrusit-aktivni-jizdy`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (onCarReplaced) onCarReplaced();
            onClose();
        } catch (err) {
            console.error('Chyba pri ruseni aktivnich jizd:', err);
            setError(err.response?.data?.message || 'Chyba pri ruseni aktivnich jizd');
        } finally {
            setCancellingRides(false);
        }
    };

    return (
        <div className="replace-car-modal">
            <div className="modal-content">
                <h2>Aktivni jizdy u auta</h2>
                <p>
                    Auto, ktere chcete smazat, ma {aktivniJizdyCount || 'nekolik'} aktivnich jizd.
                    Vyberte, zda se ma nahradit jinym autem, nebo zda se maji tyto aktivni jizdy zrusit.
                </p>

                {loading ? (
                    <p>Nacitani dostupnych aut...</p>
                ) : (
                    <>
                        {error && <p className="error-message">{error}</p>}

                        <div className="replace-option-section">
                            <h3>Nahradit auto u aktivnich jizd</h3>
                            <div className="available-cars">
                                {availableCars.length === 0 && <p>Zadna dostupna auta pro nahrazeni.</p>}
                                {availableCars.map(auto => (
                                    <div key={auto.id} className="available-car">
                                        <span>
                                            {auto.znacka} {auto.model} {auto.spz ? `(${auto.spz})` : ''}
                                        </span>
                                        <button onClick={() => replaceCar(auto.id)}>Vybrat</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr />

                        <h3>Pridat nove auto</h3>
                        <div className="new-car-form">
                            <input
                                type="text"
                                placeholder="Znacka"
                                value={newCar.znacka}
                                onChange={e => setNewCar({ ...newCar, znacka: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Model"
                                value={newCar.model}
                                onChange={e => setNewCar({ ...newCar, model: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="SPZ"
                                value={newCar.spz}
                                onChange={e => setNewCar({ ...newCar, spz: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Barva"
                                value={newCar.barva}
                                onChange={e => setNewCar({ ...newCar, barva: e.target.value })}
                            />
                            <button onClick={addNewCar} disabled={adding}>
                                {adding ? 'Pridavani...' : 'Pridat auto'}
                            </button>
                        </div>

                        <hr />

                        <div className="replace-option-section danger-section">
                            <h3>Zrusit vsechny aktivni jizdy s timto autem</h3>
                            <p className="danger-text">
                                Zrusi se pouze aktivni jizdy navazane na toto auto. Dokoncene a drive zrusene jizdy zustanou beze zmeny.
                            </p>
                            <button className="danger-btn" onClick={cancelActiveRides} disabled={cancellingRides}>
                                {cancellingRides ? 'Rusi se...' : 'Zrusit aktivni jizdy a smazat auto'}
                            </button>
                        </div>
                    </>
                )}

                <button className="close-btn" onClick={onClose}>
                    Zavrit
                </button>
            </div>
        </div>
    );
};

export default ReplaceCar;
