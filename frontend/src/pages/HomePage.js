import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RideSearch from '../components/rides/RideSearch';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
    const [latestRides, setLatestRides] = useState([]);
    const [loadingRides, setLoadingRides] = useState(true);
    const [error, setError] = useState('');
    const { token, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLatestRides = async () => {
            try {
                setLoadingRides(true);
                const response = await axios.get('http://localhost:5000/api/jizdy/');
                const now = new Date();
                const currentRides = response.data.jizdy
                    .filter(ride => new Date(ride.cas_odjezdu) > now)
                    .sort((a, b) => new Date(b.cas_odjezdu) - new Date(a.cas_odjezdu))
                    .slice(0, 10);
                setLatestRides(currentRides);
            } catch (err) {
                setError('Chyba při načítání nejnovějších jízd');
                console.error(err);
            } finally {
                setLoadingRides(false);
            }
        };

        fetchLatestRides();
    }, []);

    const handleDriverClick = (ridicId) => {
        navigate(`/profil/${ridicId}`);
    };

    const handleReservation = async (rideId) => {
        if (!user || !token) {
            alert('Pro rezervaci se musíte přihlásit');
            return;
        }
        try {
            const poznamka = prompt('Přidejte poznámku k rezervaci (volitelné):');
            await axios.post(
                'http://localhost:5000/api/rezervace/',
                { jizda_id: rideId, poznamka: poznamka || '' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Rezervace byla odeslána!');
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při rezervaci');
        }
    };

    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Spolujízda</h1>
                <p>Najděte spolujízdu nebo nabídněte svou cestu</p>
            </div>

            <div className="search-section">
                <RideSearch />
            </div>

            <div className="latest-rides-section">
                <h2>Aktuální jízdy</h2>
                {loadingRides ? (
                    <p>Načítám...</p>
                ) : error ? (
                    <p>{error}</p>
                ) : latestRides.length === 0 ? (
                    <p>Žádné aktuální jízdy nejsou k dispozici.</p>
                ) : (
                    <div className="ride-list">
                        {latestRides.map(ride => (
                            <div key={ride.id} className="ride-card">
                                <div className="ride-header">
                                    <h3>{ride.odkud} → {ride.kam}</h3>
                                    <span className="ride-price">{ride.cena} Kč</span>
                                </div>

                                <div className="ride-details">
                                    <div className="ride-time">
                                        <strong>Odjezd:</strong> {new Date(ride.cas_odjezdu).toLocaleString('cs-CZ')}
                                    </div>
                                    <div className="ride-time">
                                        <strong>Příjezd:</strong> {new Date(ride.cas_prijezdu).toLocaleString('cs-CZ')}
                                    </div>
                                    <div className="ride-info">
                                        <strong>Volná místa:</strong> {ride.volna_mista || ride.pocet_mist} / {ride.pocet_mist}
                                    </div>
                                    <div className="ride-info">
                                        <strong>Řidič:</strong> 
                                        <button
                                            className="ride-driver"
                                            onClick={() => handleDriverClick(ride.ridic_id)}
                                        >
                                            {ride.ridic?.jmeno || 'Neznámý'}
                                        </button>
                                    </div>
                                </div>

                                <div className="ride-actions">
                                    <button className="btn-reserve" onClick={() => handleReservation(ride.id)}>
                                        Rezervovat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
