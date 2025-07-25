import React from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';

const RideList = ({ rides, onRideUpdate }) => {
    const { token, user } = useAuth();

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const handleReservation = async (jizdaId) => {
        try {
            const poznamka = prompt('Přidejte poznámku k rezervaci (volitelné):');

            const response = await axios.post(
                'http://localhost:5000/api/rezervace',
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
                            <strong>Řidič:</strong> {ride.ridic?.jmeno || 'Neznámý'}
                        </div>
                        {ride.auto && (
                            <div className="ride-info">
                                <strong>Auto:</strong> {ride.auto.znacka} {ride.auto.model} ({ride.auto.spz})
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
                            <button
                                className="btn-delete"
                                onClick={() => handleDeleteRide(ride.id)}
                            >
                                Zrušit jízdu
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RideList;
