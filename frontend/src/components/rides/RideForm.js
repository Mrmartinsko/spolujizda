import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideForm.css';

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
    const [add_car, setAdd_car] = useState(false);
    const [new_car_data, setNew_car_data] = usestate({
        znacka: '',
        model: '',
        barva: '',
        spz: ''
    });
    
    const handleNewCarChange = (e) => {
        setNew_car_data({
            ...new_car_data,
            [e.target.name]: e.target.valu
        });
    };

    useEffect(() => {
        fetchUserCars();
    }, []);
    const handleAddCar = async () => {
        try {
            const response = await axios.post('http://localhost:5000/api/auta/moje-nove', new_car_data, {
            headers: { Authorization: `Bearer ${token}` }
            });
            alert('Auto přidáno!');
            setShowAddCarForm(false);
            await fetchUserCars();
            setFormData({ ...formData, auto_id: response.data.auto.id }); // vyber nové auto
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při přidávání auta');
    }
    };
    const fetchUserCars = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/auta/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAuta(response.data.auta || []);
        } catch (err) {
            console.error('Chyba při načítání aut:', err);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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
        const response = await axios.post('http://localhost:5000/api/jizdy', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (onRideCreated) {
            onRideCreated(response.data);
        }

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

            <form onSubmit={handleSubmit}>
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
        </div>
    );
};

export default RideForm;
