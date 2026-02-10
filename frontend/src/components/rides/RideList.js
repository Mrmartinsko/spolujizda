import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';
import { useNavigate } from 'react-router-dom';



const RideList = ({ rides, onRideUpdate }) => {
    const { token, user } = useAuth();
    const [showReservations, setShowReservations] = useState({});
    const [rezervace, setRezervace] = useState({});
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const handleReservation = async (jizdaId) => {
        try {
            const poznamka = prompt('Přidejte poznámku k rezervaci (volitelné):');

            const response = await axios.post(
                'http://localhost:5000/api/rezervace/',
                {
                    jizda_id: jizdaId,
                    poznamka: poznamka || ''
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            alert('Rezervace byla odeslána!');
            if (onRideUpdate) {
                onRideUpdate();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při rezervaci');
        }
    };

    const fetchReservations = async (jizdaId) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/rezervace/jizda/${jizdaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRezervace(prev => ({
                ...prev,
                [jizdaId]: response.data.rezervace
            }));
        } catch (err) {
            console.error('Chyba při načítání rezervací:', err);
            alert(err.response?.data?.error || 'Chyba při načítání rezervací');
        }
    };

    const toggleReservations = async (jizdaId) => {
        const isShowing = showReservations[jizdaId];

        setShowReservations(prev => ({
            ...prev,
            [jizdaId]: !isShowing
        }));

        if (!isShowing && !rezervace[jizdaId]) {
            await fetchReservations(jizdaId);
        }
    };

    const handleReservationAction = async (rezervaceId, action, jizdaId) => {
        try {
            await axios.post(
                `http://localhost:5000/api/rezervace/${rezervaceId}/${action}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(`Rezervace byla ${action === 'prijmout' ? 'přijata' : 'odmítnuta'}`);
            // Refresh reservations
            await fetchReservations(jizdaId);
            if (onRideUpdate) {
                onRideUpdate();
            }
        } catch (err) {
            alert(err.response?.data?.error || `Chyba při ${action} rezervace`);
        }
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

    const handleDeleteRide = async (jizdaId) => {
        if (window.confirm('Opravdu chcete zrušit tuto jízdu?')) {
            try {
                console.log("Zrušení jízdy s ID:", jizdaId);
                await axios.delete(`http://localhost:5000/api/jizdy/${jizdaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                alert('Jízda byla zrušena');
                if (onRideUpdate) {
                    onRideUpdate();
                }
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při rušení jízdy');
            }
        }
    };

    if (!rides || rides.length === 0) {
        return (
            <div className="ride-list">
                <p className="no-rides">Žádné jízdy nenalezeny</p>
            </div>
        );
    }

    return (
        <div className="ride-list">
            {rides.map(ride => (
                <div key={ride.id} className="ride-card">
                    <div className="ride-header">
                        <h3>{ride.odkud} → {ride.kam}</h3>
                        <span className="ride-price">{ride.cena} Kč</span>
                    </div>

                    <div className="ride-details">
                        <div className="ride-time">
                            <strong>Odjezd:</strong> {formatDate(ride.cas_odjezdu)}
                        </div>
                        <div className="ride-time">
                            <strong>Příjezd:</strong> {formatDate(ride.cas_prijezdu)}
                        </div>
                        <div className="ride-info">
                            <strong>Volná místa:</strong> {ride.volna_mista || (ride.pocet_mist - (ride.pasazeri ? ride.pasazeri.length : 0))} / {ride.pocet_mist}
                        </div>
                        <div className="ride-info">
                            <strong>Řidič:</strong> 
                            <span 
                                onClick={() => navigate(`/profil/${ride.ridic.id}`)}
                                style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                            >
                                {ride.ridic?.jmeno || 'Neznámý'}
                            </span>
                        </div>
                        {ride.auto && (
                            <div className="ride-info">
                                <strong>Auto:</strong>{" "}
                                {ride.auto.smazane
                                    ? "Smazané auto"
                                    : (
                                        <>
                                            {ride.auto.znacka}
                                            {ride.auto.model && ` ${ride.auto.model}`}
                                            {ride.auto.spz && ` (${ride.auto.spz})`}
                                        </>
                                    )
                                }
                            </div>
                        )}
                        <div className="ride-status">
                            <strong>Status:</strong>
                            <span className={`status ${ride.status}`}>{ride.status}</span>
                        </div>
                    </div>

                    <div className="ride-actions">
                        {user && ride.ridic_id !== user.id && ride.status === 'aktivni' && (
                            <button
                                className="btn-reserve"
                                onClick={() => handleReservation(ride.id)}
                            >
                                Rezervovat
                            </button>
                        )}

                    {user && ride.ridic_id === user.id && (
                        <>
                            <button
                                className="btn-reservations"
                                onClick={() => toggleReservations(ride.id)}
                            >
                                {showReservations[ride.id] ? 'Skrýt rezervace' : 'Zobrazit rezervace'}
                                {rezervace[ride.id] && ` (${rezervace[ride.id].length})`}
                            </button>

                            {ride.status === 'aktivni' && (
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteRide(ride.id)}
                                >
                                    Zrušit jízdu
                                </button>
                            )}
                        </>
                    )}

                    </div>

                    {/* Rezervace pro řidiče */}
                    {user && ride.ridic_id === user.id && showReservations[ride.id] && (
                        <div className="reservations-section">
                            <h4>Rezervace na tuto jízdu:</h4>
                            {rezervace[ride.id] && rezervace[ride.id].length > 0 ? (
                                <div className="reservations-list">
                                    {rezervace[ride.id].map(rezervace => (
                                        <div key={rezervace.id} className="reservation-item">
                                            <div className="reservation-info">
                                                <div className="passenger-name">
                                                    <strong>{rezervace.uzivatel?.jmeno || 'Neznámý uživatel'}</strong>
                                                </div>
                                                <div
                                                    className="reservation-status"
                                                    style={{ color: getStatusColor(rezervace.status) }}
                                                >
                                                    {getStatusText(rezervace.status)}
                                                </div>
                                                {rezervace.poznamka && (
                                                    <div className="reservation-note">
                                                        <em>"{rezervace.poznamka}"</em>
                                                    </div>
                                                )}
                                            </div>
                                            {rezervace.status === 'cekajici' && (
                                                <div className="reservation-actions">
                                                    <button
                                                        className="btn-accept"
                                                        onClick={() => handleReservationAction(rezervace.id, 'prijmout', ride.id)}
                                                    >
                                                        Přijmout
                                                    </button>
                                                    <button
                                                        className="btn-reject"
                                                        onClick={() => handleReservationAction(rezervace.id, 'odmitnout', ride.id)}
                                                    >
                                                        Odmítnout
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-reservations">
                                    Žádné rezervace na tuto jízdu
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default RideList;
