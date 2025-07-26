import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './MyReservationsPage.css';

const MyReservationsPage = () => {
    const { token } = useAuth();
    const [rezervace, setRezervace] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, cekajici, prijata, odmitnuta, zrusena

    useEffect(() => {
        fetchRezervace();
    }, []);

    const fetchRezervace = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/rezervace/moje', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filtrujeme pouze rezervace, které jsem udělal jako pasažér (typ: "odeslana")
            const mojeRezervace = response.data.filter(r => r.typ === 'odeslana');
            setRezervace(mojeRezervace);
            setError('');
        } catch (err) {
            setError('Chyba při načítání rezervací');
            console.error('Error fetching reservations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReservation = async (rezervaceId) => {
        if (window.confirm('Opravdu chcete zrušit tuto rezervaci?')) {
            try {
                await axios.delete(`http://localhost:5000/api/rezervace/${rezervaceId}/zrusit`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                alert('Rezervace byla zrušena');
                fetchRezervace(); // Refresh the list
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při rušení rezervace');
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'cekajici': return '#ffa500';
            case 'prijata': return '#28a745';
            case 'odmitnuta': return '#dc3545';
            case 'zrusena': return '#6c757d';
            default: return '#007bff';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'cekajici': return 'Čekající';
            case 'prijata': return 'Přijatá';
            case 'odmitnuta': return 'Odmítnutá';
            case 'zrusena': return 'Zrušená';
            default: return status;
        }
    };

    const filteredRezervace = rezervace.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    if (loading) {
        return (
            <div className="my-reservations-page">
                <div className="loading">Načítám rezervace...</div>
            </div>
        );
    }

    return (
        <div className="my-reservations-page">
            <div className="page-header">
                <h1>Moje rezervace</h1>
                <p>Přehled jízd, na které jste si udělali rezervaci</p>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={fetchRezervace} className="retry-btn">
                        Zkusit znovu
                    </button>
                </div>
            )}

            <div className="filters">
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    Všechny ({rezervace.length})
                </button>
                <button
                    className={filter === 'cekajici' ? 'active' : ''}
                    onClick={() => setFilter('cekajici')}
                >
                    Čekající ({rezervace.filter(r => r.status === 'cekajici').length})
                </button>
                <button
                    className={filter === 'prijata' ? 'active' : ''}
                    onClick={() => setFilter('prijata')}
                >
                    Přijaté ({rezervace.filter(r => r.status === 'prijata').length})
                </button>
                <button
                    className={filter === 'odmitnuta' ? 'active' : ''}
                    onClick={() => setFilter('odmitnuta')}
                >
                    Odmítnuté ({rezervace.filter(r => r.status === 'odmitnuta').length})
                </button>
                <button
                    className={filter === 'zrusena' ? 'active' : ''}
                    onClick={() => setFilter('zrusena')}
                >
                    Zrušené ({rezervace.filter(r => r.status === 'zrusena').length})
                </button>
            </div>

            <div className="reservations-list">
                {filteredRezervace.length === 0 ? (
                    <div className="no-reservations">
                        {filter === 'all'
                            ? 'Nemáte žádné rezervace'
                            : `Nemáte žádné rezervace se statusem "${getStatusText(filter)}"`
                        }
                    </div>
                ) : (
                    filteredRezervace.map(rezervace => (
                        <div key={rezervace.id} className="reservation-card">
                            <div className="reservation-header">
                                <div className="route-info">
                                    <h3>{rezervace.jizda?.odkud || 'N/A'} → {rezervace.jizda?.kam || 'N/A'}</h3>
                                    <span className="price">{rezervace.jizda?.cena || 0} Kč</span>
                                </div>
                                <div
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(rezervace.status) }}
                                >
                                    {getStatusText(rezervace.status)}
                                </div>
                            </div>

                            <div className="reservation-details">
                                <div className="time-info">
                                    <div className="time-item">
                                        <strong>Odjezd:</strong> {formatDate(rezervace.jizda?.cas_odjezdu)}
                                    </div>
                                    <div className="time-item">
                                        <strong>Příjezd:</strong> {formatDate(rezervace.jizda?.cas_prijezdu)}
                                    </div>
                                </div>

                                <div className="driver-info">
                                    <strong>Řidič:</strong> {rezervace.jizda?.ridic?.jmeno || 'Neznámý'}
                                </div>

                                {rezervace.jizda?.auto && (
                                    <div className="car-info">
                                        <strong>Auto:</strong> {rezervace.jizda.auto.znacka} {rezervace.jizda.auto.model}
                                        {rezervace.jizda.auto.spz && ` (${rezervace.jizda.auto.spz})`}
                                    </div>
                                )}

                                {rezervace.poznamka && (
                                    <div className="note-info">
                                        <strong>Poznámka:</strong> {rezervace.poznamka}
                                    </div>
                                )}
                            </div>

                            <div className="reservation-actions">
                                {rezervace.status === 'cekajici' && (
                                    <button
                                        className="btn-cancel"
                                        onClick={() => handleCancelReservation(rezervace.id)}
                                    >
                                        Zrušit rezervaci
                                    </button>
                                )}

                                {rezervace.status === 'prijata' && (
                                    <div className="accepted-info">
                                        <span className="success-text">✅ Rezervace přijata!</span>
                                        <button
                                            className="btn-cancel"
                                            onClick={() => handleCancelReservation(rezervace.id)}
                                        >
                                            Zrušit rezervaci
                                        </button>
                                    </div>
                                )}

                                {rezervace.status === 'odmitnuta' && (
                                    <div className="rejected-info">
                                        <span className="error-text">❌ Rezervace odmítnuta</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyReservationsPage;
