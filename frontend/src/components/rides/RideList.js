import React from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { mapRideData } from '../../utils/apiMapper';
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
            {rides.map(ride => {
                // Mapuj data pro konzistentní přístup
                const mappedRide = mapRideData(ride);
                
                return (
                    <div key={mappedRide.id} className="ride-card">
                        <div className="ride-header">
                            <h3>{mappedRide.odkud} → {mappedRide.kam}</h3>
                            <span className="ride-price">{mappedRide.cena} Kč</span>
                        </div>

                        <div className="ride-details">
                            <div className="ride-time">
                                <strong>Odjezd:</strong> {formatDate(mappedRide.casOdjezdu)}
                            </div>
                            <div className="ride-time">
                                <strong>Příjezd:</strong> {formatDate(mappedRide.casPrijezdu)}
                            </div>
                            <div className="ride-info">
                                <strong>Volná místa:</strong> {mappedRide.volnaMista || (mappedRide.pocetMist - (mappedRide.pasazeri ? mappedRide.pasazeri.length : 0))} / {mappedRide.pocetMist}
                            </div>
                            <div className="ride-info">
                                <strong>Řidič:</strong> {mappedRide.ridic?.jmeno || 'Neznámý'}
                            </div>
                            {mappedRide.auto && (
                                <div className="ride-info">
                                    <strong>Auto:</strong> {mappedRide.auto.znacka} {mappedRide.auto.model} ({mappedRide.auto.spz})
                                </div>
                            )}
                            <div className="ride-status">
                                <strong>Status:</strong>
                                <span className={`status ${mappedRide.status}`}>{mappedRide.status}</span>
                            </div>
                        </div>

                        <div className="ride-actions">
                            {user && mappedRide.ridicId !== user.id && mappedRide.status === 'aktivni' && (
                                <button
                                    className="btn-reserve"
                                    onClick={() => handleReservation(mappedRide.id)}
                                >
                                    Rezervovat
                                </button>
                            )}

                            {user && mappedRide.ridicId === user.id && (
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteRide(mappedRide.id)}
                                >
                                    Zrušit jízdu
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RideList;
