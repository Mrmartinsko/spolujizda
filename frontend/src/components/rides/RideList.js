import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';
import { useNavigate } from 'react-router-dom';

const RideList = ({ rides, onRideUpdate }) => {
    const { token, user } = useAuth();
    const [showReservations, setShowReservations] = useState({});
    const [rezervace, setRezervace] = useState({});
    const [expanded, setExpanded] = useState({}); // ✅ rozbalení detailů
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const getRideRouteText = (ride) => {
        const stops = (ride.mezistanice || [])
            .slice()
            .sort((a, b) => (a.poradi ?? 0) - (b.poradi ?? 0))
            .map(s => s.misto)
            .filter(Boolean);

        return [ride.odkud, ...stops, ride.kam].filter(Boolean).join(' → ');
    };

    const toggleExpanded = (rideId) => {
        setExpanded(prev => ({ ...prev, [rideId]: !prev[rideId] }));
    };

    const handleReservation = async (jizdaId) => {
        try {
            const poznamka = prompt('Přidejte poznámku k rezervaci (volitelné):');

            await axios.post(
                'http://localhost:5000/api/rezervace/',
                { jizda_id: jizdaId, poznamka: poznamka || '' },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Rezervace byla odeslána!');
            if (onRideUpdate) onRideUpdate();
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při rezervaci');
        }
    };

    const fetchReservations = async (jizdaId) => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/rezervace/jizda/${jizdaId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
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

        // když se poprvé otevírá, načti
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
            await fetchReservations(jizdaId);
            if (onRideUpdate) onRideUpdate();
        } catch (err) {
            alert(err.response?.data?.error || `Chyba při ${action} rezervace`);
        }
    };

    const handleDeleteRide = async (jizdaId) => {
        if (window.confirm('Opravdu chcete zrušit tuto jízdu?')) {
            try {
                await axios.delete(
                    `http://localhost:5000/api/jizdy/${jizdaId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                alert('Jízda byla zrušena');
                if (onRideUpdate) onRideUpdate();
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
            {rides.map(ride => {
                const isExpanded = !!expanded[ride.id];

                return (
                    <div key={ride.id} className={`ride-card ${isExpanded ? 'expanded' : ''}`}>
                        {/* HLAVIČKA: trasa + cena + šipka */}
                        <button
                            type="button"
                            className="ride-header ride-header-btn"
                            onClick={() => toggleExpanded(ride.id)}
                        >
                            <h3 className="ride-route">{getRideRouteText(ride)}</h3>
                            <div className="ride-header-right">
                                <span className="ride-price">{ride.cena} Kč</span>
                                <span className={`chevron ${isExpanded ? 'open' : ''}`}>▾</span>
                            </div>
                        </button>

                        {/* DETAILY: jen když je rozbaleno */}
                        {isExpanded && (
                            <>
                                <div className="ride-details">
                                    <div className="ride-time">
                                        <strong>Odjezd:</strong> {formatDate(ride.cas_odjezdu)}
                                    </div>
                                    <div className="ride-time">
                                        <strong>Příjezd:</strong> {formatDate(ride.cas_prijezdu)}
                                    </div>

                                    <div className="ride-info">
                                        <strong>Volná místa:</strong> {ride.volna_mista} / {ride.pocet_mist}
                                    </div>

                                    <div className="ride-info">
                                        <strong>Řidič:</strong>{' '}
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/profil/${ride.ridic_id}`);
                                            }}
                                            style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                                        >
                                            {ride.ridic?.jmeno || 'Neznámý'}
                                        </span>
                                    </div>

                                    {ride.auto && (
                                        <div className="ride-info">
                                            <strong>Auto:</strong>{' '}
                                            {ride.auto.smazane
                                                ? 'Smazané auto'
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

                                    {ride.mezistanice && ride.mezistanice.length > 0 && (
                                        <div className="ride-info">
                                            <strong>Mezistanice:</strong>{' '}
                                            {ride.mezistanice
                                                .slice()
                                                .sort((a, b) => a.poradi - b.poradi)
                                                .map(m => m.misto)
                                                .join(' → ')
                                            }
                                        </div>
                                    )}

                                    <div className="ride-status">
                                        <strong>Status:</strong>{' '}
                                        <span className={`status ${ride.status}`}>{ride.status}</span>
                                    </div>
                                </div>

                                <div className="ride-actions" onClick={(e) => e.stopPropagation()}>
                                    {user && ride.ridic_id !== user.id && ride.status === 'aktivni' && (
                                        <button className="btn-reserve" onClick={() => handleReservation(ride.id)}>
                                            Rezervovat
                                        </button>
                                    )}

                                    {user && ride.ridic_id === user.id && (
                                        <>
                                            <button className="btn-reservations" onClick={() => toggleReservations(ride.id)}>
                                                {showReservations[ride.id] ? 'Skrýt rezervace' : 'Zobrazit rezervace'}
                                                {rezervace[ride.id] && ` (${rezervace[ride.id].length})`}
                                            </button>

                                            {ride.status === 'aktivni' && (
                                                <button className="btn-delete" onClick={() => handleDeleteRide(ride.id)}>
                                                    Zrušit jízdu
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Rezervace pro řidiče */}
                                {user && ride.ridic_id === user.id && showReservations[ride.id] && (
                                    <div className="reservations-section" onClick={(e) => e.stopPropagation()}>
                                        <h4>Rezervace na tuto jízdu:</h4>

                                        {rezervace[ride.id] && rezervace[ride.id].length > 0 ? (
                                            <div className="reservations-list">
                                                {rezervace[ride.id].map(r => (
                                                    <div key={r.id} className="reservation-item">
                                                        <div className="reservation-info">
                                                            <div className="passenger-name">
                                                                <strong>{r.uzivatel?.jmeno || 'Neznámý uživatel'}</strong>
                                                            </div>
                                                            <div className="reservation-status">
                                                                {r.status}
                                                            </div>
                                                            {r.poznamka && (
                                                                <div className="reservation-note">
                                                                    <em>"{r.poznamka}"</em>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {r.status === 'cekajici' && (
                                                            <div className="reservation-actions">
                                                                <button
                                                                    className="btn-accept"
                                                                    onClick={() => handleReservationAction(r.id, 'prijmout', ride.id)}
                                                                >
                                                                    Přijmout
                                                                </button>
                                                                <button
                                                                    className="btn-reject"
                                                                    onClick={() => handleReservationAction(r.id, 'odmitnout', ride.id)}
                                                                >
                                                                    Odmítnout
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-reservations">Žádné rezervace na tuto jízdu</div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RideList;
