import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import RideList from '../components/rides/RideList';
import './MyRidesPage.css';

const MyRidesPage = () => {
    const { token } = useAuth();
    const [mojeJizdy, setMojeJizdy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, completed, cancelled

    useEffect(() => {
        fetchMojeJizdy();
    }, []);

    const fetchMojeJizdy = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/jizdy/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMojeJizdy(response.data);
        } catch (err) {
            setError('Chyba při načítání jízd');
        } finally {
            setLoading(false);
        }
    };

    const handleRideUpdate = () => {
        fetchMojeJizdy();
    };

    const getStatusText = (status) => {
        const statusMap = {
            'aktivni': 'Aktivní',
            'zrusena': 'Zrušená',
            'dokoncena': 'Dokončená'
        };
        return statusMap[status] || status;
    };

    const filteredJizdy = mojeJizdy.filter(jizda => {
        if (filter === 'all') return true;
        if (filter === 'active') return jizda.status === 'aktivni';
        if (filter === 'completed') return jizda.status === 'dokoncena';
        if (filter === 'cancelled') return jizda.status === 'zrusena';
        return true;
    });

    if (loading) {
        return (
            <div className="my-rides-page">
                <div className="loading">Načítám vaše jízdy...</div>
            </div>
        );
    }

    return (
        <div className="my-rides-page">
            <div className="page-header">
                <h1>Moje jízdy</h1>
                <p>Přehled všech vašich nabídnutých jízd</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filter-controls">
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    Všechny ({mojeJizdy.length})
                </button>
                <button
                    className={filter === 'active' ? 'active' : ''}
                    onClick={() => setFilter('active')}
                >
                    Aktivní ({mojeJizdy.filter(j => j.status === 'aktivni').length})
                </button>
                <button
                    className={filter === 'completed' ? 'active' : ''}
                    onClick={() => setFilter('completed')}
                >
                    Dokončené ({mojeJizdy.filter(j => j.status === 'dokoncena').length})
                </button>
                <button
                    className={filter === 'cancelled' ? 'active' : ''}
                    onClick={() => setFilter('cancelled')}
                >
                    Zrušené ({mojeJizdy.filter(j => j.status === 'zrusena').length})
                </button>
            </div>

            {filteredJizdy.length === 0 ? (
                <div className="no-rides">
                    <h3>Žádné jízdy</h3>
                    <p>
                        {filter === 'all'
                            ? 'Zatím jste nenabídli žádnou jízdu.'
                            : `Žádné ${getStatusText(filter).toLowerCase()} jízdy.`
                        }
                    </p>
                    <a href="/create-ride" className="create-ride-btn">
                        Nabídnout první jízdu
                    </a>
                </div>
            ) : (
                <div className="rides-container">
                    <RideList
                        rides={filteredJizdy}
                        onRideUpdate={handleRideUpdate}
                        showManageActions={true}
                    />
                </div>
            )}

            <div className="stats-section">
                <h2>Statistiky</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{mojeJizdy.length}</div>
                        <div className="stat-label">Celkem jízd</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {mojeJizdy.filter(j => j.status === 'aktivni').length}
                        </div>
                        <div className="stat-label">Aktivních jízd</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {mojeJizdy.reduce((sum, jizda) => {
                                return sum + (jizda.pasazeri ? jizda.pasazeri.length : 0);
                            }, 0)}
                        </div>
                        <div className="stat-label">Převezených pasažérů</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">
                            {mojeJizdy.filter(j => j.status === 'dokoncena').length}
                        </div>
                        <div className="stat-label">Dokončených cest</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyRidesPage;
