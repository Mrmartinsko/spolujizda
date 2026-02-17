import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RideSearch from '../components/rides/RideSearch';
import RideList from '../components/rides/RideList';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
    const [latestRides, setLatestRides] = useState([]);
    const [loadingRides, setLoadingRides] = useState(true);
    const [error, setError] = useState('');
    const [pendingRatings, setPendingRatings] = useState([]); // pending hodnocení

    const { token } = useAuth();
    const navigate = useNavigate();

    const fetchLatestRides = async () => {
        try {
            setLoadingRides(true);
            const response = await axios.get('http://localhost:5000/api/jizdy/');
            const now = new Date();
            const currentRides = response.data.jizdy
                .filter((ride) => new Date(ride.cas_odjezdu) > now)
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

    useEffect(() => {
        fetchLatestRides();
    }, []);

    useEffect(() => {
        const fetchPending = async () => {
            if (!token) {
                setPendingRatings([]);
                return;
            }
            try {
                const res = await axios.get('http://localhost:5000/api/hodnoceni/pending', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPendingRatings(res.data.pending || []);
            } catch (e) {
                console.error('Chyba při načítání pending hodnocení:', e);
            }
        };

        fetchPending();
    }, [token]);

    const goToPendingRating = () => {
        if (!pendingRatings.length) return;
        const p = pendingRatings[0];
        navigate(`/ohodnotit/${p.jizda_id}/${p.cilovy_uzivatel_id}`);
    };

    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Spolujízda</h1>
                <p>Najděte spolujízdu nebo nabídněte svou cestu</p>
            </div>

            {pendingRatings.length > 0 && (
                <div className="pending-banner">
                    <div className="pending-banner__text">
                        Máš nevyřízené hodnocení řidiče z jízdy{' '}
                        <strong>
                            {pendingRatings[0].jizda?.odkud} → {pendingRatings[0].jizda?.kam}
                        </strong>
                        .
                    </div>
                    <button className="pending-banner__btn" onClick={goToPendingRating}>
                        Ohodnotit
                    </button>
                </div>
            )}

            <div className="search-section">
                <RideSearch />
            </div>

            <div className="latest-rides-section">
                <h2>Aktuální jízdy</h2>
                {loadingRides ? (
                    <p className="latest-rides-message">Načítám...</p>
                ) : error ? (
                    <p className="latest-rides-message">{error}</p>
                ) : latestRides.length === 0 ? (
                    <p className="latest-rides-message">Žádné aktuální jízdy nejsou k dispozici.</p>
                ) : (
                    <RideList rides={latestRides} onRideUpdate={fetchLatestRides} />
                )}
            </div>
        </div>
    );
};

export default HomePage;
