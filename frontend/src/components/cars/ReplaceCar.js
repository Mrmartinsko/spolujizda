import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './ReplaceCar.css';

const ReplaceCar = ({ autoId, onClose, onCarReplaced }) => {
    const { token } = useAuth();
    const [availableCars, setAvailableCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newCar, setNewCar] = useState({ znacka: '', model: '', spz: '', barva: '' });
    const [adding, setAdding] = useState(false);

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
                console.error('Chyba při načítání dostupných aut:', err);
                setError(err.response?.data?.message || 'Chyba při načítání aut');
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
            console.error('Chyba při nahrazování auta:', err);
            setError(err.response?.data?.message || 'Chyba při nahrazování auta');
        }
    };

    const addNewCar = async () => {
        if (!newCar.znacka || !newCar.model) {
            setError('Značka a model jsou povinné.');
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

            // Přidáme nové auto do seznamu dostupných aut
            setAvailableCars(prev => [...prev, response.data.auto]);
            setNewCar({ znacka: '', model: '', spz: '', barva: '' });

        } catch (err) {
            console.error('Chyba při přidávání auta:', err);
            setError(err.response?.data?.message || 'Chyba při přidávání auta');
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="replace-car-modal">
            <div className="modal-content">
                <h2>Nahrazení auta</h2>
                <p>Auto, které chcete smazat, má aktivní jízdy. Vyberte nové auto pro nahrazení:</p>

                {loading ? (
                    <p>Načítání dostupných aut...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : (
                    <>
                        <div className="available-cars">
                            {availableCars.length === 0 && <p>Žádná dostupná auta pro nahrazení.</p>}
                            {availableCars.map(auto => (
                                <div key={auto.id} className="available-car">
                                    <span>
                                        {auto.znacka} {auto.model} {auto.spz ? `(${auto.spz})` : ''}
                                    </span>
                                    <button onClick={() => replaceCar(auto.id)}>Vybrat</button>
                                </div>
                            ))}
                        </div>

                        <hr />

                        <h3>Přidat nové auto</h3>
                        <div className="new-car-form">
                            <input
                                type="text"
                                placeholder="Značka"
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
                                {adding ? 'Přidávání...' : 'Přidat auto'}
                            </button>
                        </div>
                    </>
                )}

                <button className="close-btn" onClick={onClose}>
                    Zavřít
                </button>
            </div>
        </div>
    );
};

export default ReplaceCar;
