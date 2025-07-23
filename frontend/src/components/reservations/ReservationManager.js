import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ReservationManager.css';

const ReservationManager = () => {
    const { token } = useAuth();
    const [rezervace, setRezervace] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected

    useEffect(() => {
        fetchRezervace();
    }, []);

    const fetchRezervace = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/rezervace/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRezervace(response.data);
        } catch (err) {
            setError('Chyba při načítání rezervací');
        } finally {
            setLoading(false);
        }
    };

    const handleReservationAction = async (rezervaceId, action) => {
        try {
            await axios.put(
                `http://localhost:5000/api/rezervace/${rezervaceId}/${action}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            fetchRezervace();
            alert(`Rezervace byla ${action === 'prijmout' ? 'přijata' : 'odmítnuta'}`);
        } catch (err) {
            alert(err.response?.data?.error || `Chyba při ${action} rezervace`);
        }
    };

    const handleCancelReservation = async (rezervaceId) => {
        if (window.confirm('Opravdu chcete zrušit tuto rezervaci?')) {
            try {
                await axios.delete(`http://localhost:5000/api/rezervace/${rezervaceId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                fetchRezervace();
                alert('Rezervace byla zrušena');
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při rušení rezervace');
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const getStatusText = (status) => {
        const statusMap = {
            'cekajici': 'Čekající',
            'prijata': 'Přijata',
            'odmitnuta': 'Odmítnuta'
        };
        return statusMap[status] || status;
    };

    const filteredRezervace = rezervace.filter(rezervace => {
        if (filter === 'all') return true;
        return rezervace.status === filter;
    });

    if (loading) {
        return <div className="loading">Načítám rezervace...</div>;
    }

    return (
        <div className="reservation-manager">
            <h2>Správa rezervací</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="filter-controls">
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    Všechny
                </button>
                <button
                    className={filter === 'cekajici' ? 'active' : ''}
                    onClick={() => setFilter('cekajici')}
                >
                    Čekající
                </button>
                <button
                    className={filter === 'prijata' ? 'active' : ''}
                    onClick={() => setFilter('prijata')}
                >
                    Přijané
                </button>
                <button
                    className={filter === 'odmitnuta' ? 'active' : ''}
                    onClick={() => setFilter('odmitnuta')}
                >
                    Odmítnuté
                </button>
            </div>

            {filteredRezervace.length === 0 ? (
                <div className="no-reservations">
                    {filter === 'all' ? 'Žádné rezervace' : `Žádné ${getStatusText(filter).toLowerCase()} rezervace`}
                </div>
            ) : (
                <div className="reservations-list">
                    {filteredRezervace.map(rezervace => (
                        <div key={rezervace.id} className="reservation-card">
                            <div className="reservation-header">
                                <h3>{rezervace.jizda.odkud} → {rezervace.jizda.kam}</h3>
                                <span className={`status ${rezervace.status}`}>
                                    {getStatusText(rezervace.status)}
                                </span>
                            </div>

                            <div className="reservation-details">
                                <div className="ride-info">
                                    <p><strong>Odjezd:</strong> {formatDate(rezervace.jizda.casOdjezdu)}</p>
                                    <p><strong>Cena:</strong> {rezervace.jizda.cena} Kč</p>
                                    <p><strong>Řidič:</strong> {rezervace.jizda.ridic?.profil?.jmeno || 'Neznámý'}</p>
                                    {rezervace.jizda.auto && (
                                        <p><strong>Auto:</strong> {rezervace.jizda.auto.znacka} {rezervace.jizda.auto.model}</p>
                                    )}
                                </div>

                                {rezervace.poznamka && (
                                    <div className="reservation-note">
                                        <strong>Poznámka:</strong> {rezervace.poznamka}
                                    </div>
                                )}
                            </div>

                            <div className="reservation-actions">
                                {rezervace.typ === 'prijata' && rezervace.status === 'cekajici' && (
                                    <>
                                        <button
                                            className="btn-accept"
                                            onClick={() => handleReservationAction(rezervace.id, 'prijmout')}
                                        >
                                            Přijmout
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleReservationAction(rezervace.id, 'odmitnout')}
                                        >
                                            Odmítnout
                                        </button>
                                    </>
                                )}

                                {rezervace.typ === 'odeslana' && rezervace.status === 'cekajici' && (
                                    <button
                                        className="btn-cancel"
                                        onClick={() => handleCancelReservation(rezervace.id)}
                                    >
                                        Zrušit rezervaci
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReservationManager;
