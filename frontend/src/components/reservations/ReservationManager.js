import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import './ReservationManager.css';
import ReservationPassengerSummary from './ReservationPassengerSummary';

const ReservationManager = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [rezervace, setRezervace] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cancelModal, setCancelModal] = useState({ open: false, rezervaceId: null });
    const [filter, setFilter] = useState('all');

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
            setError('');
            setSuccess(`Rezervace byla ${action === 'prijmout' ? 'přijata' : 'odmítnuta'}`);
        } catch (err) {
            setSuccess('');
            setError(err.response?.data?.error || `Chyba při ${action} rezervace`);
        }
    };

    const executeCancelReservation = async (rezervaceId) => {
        const target = rezervace.find((r) => r.id === rezervaceId);
        if (!canCancelReservationByRule(target)) {
            setSuccess('');
            setError('Rezervaci lze zrušit jen pokud je jízda aktivní a před odjezdem.');
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/rezervace/${rezervaceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchRezervace();
            setError('');
            setSuccess('Rezervace byla zrušena');
        } catch (err) {
            setSuccess('');
            setError(err.response?.data?.error || 'Chyba při rušení rezervace');
        }
    };

    const handleCancelReservation = (rezervaceId) => {
        const target = rezervace.find((r) => r.id === rezervaceId);
        if (!canCancelReservationByRule(target)) {
            setSuccess('');
            setError('Rezervaci lze zrušit jen pokud je jízda aktivní a před odjezdem.');
            return;
        }
        setCancelModal({ open: true, rezervaceId });
    };

    const hasNotDepartedYet = (ride) => {
        if (!ride?.cas_odjezdu) return false;
        const d = new Date(ride.cas_odjezdu);
        if (Number.isNaN(d.getTime())) return false;
        return d > new Date();
    };

    const canCancelReservationByRule = (rezervaceItem) => {
        if (!rezervaceItem?.jizda) return false;
        return rezervaceItem.jizda.status === 'aktivni' && hasNotDepartedYet(rezervaceItem.jizda);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    const getStatusText = (status) => {
        const statusMap = {
            cekajici: 'Čekající',
            prijata: 'Přijata',
            odmitnuta: 'Odmítnuta'
        };
        return statusMap[status] || status;
    };

    const getPassengerDisplayName = (passenger) => {
        if (!passenger) return 'Neznámý uživatel';
        const fullName = [passenger.jmeno, passenger.prijmeni].filter(Boolean).join(' ').trim();
        return fullName || passenger.prezdivka || passenger.username || 'Neznámý uživatel';
    };

    const filteredRezervace = rezervace.filter((item) => {
        if (filter === 'all') return true;
        return item.status === filter;
    });

    if (loading) {
        return <div className="loading">Načítám rezervace...</div>;
    }

    return (
        <div className="reservation-manager">
            <h2>Správa rezervací</h2>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

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
                    Přijaté
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
                    {filteredRezervace.map((item) => {
                        const mainPassengerId = item.uzivatel?.id;
                        const mainPassengerName = getPassengerDisplayName(item.uzivatel);

                        return (
                            <div key={item.id} className="reservation-card">
                                <div className="reservation-header">
                                    <h3>{item.jizda.odkud} → {item.jizda.kam}</h3>
                                    <span className={`status ${item.status}`}>
                                        {getStatusText(item.status)}
                                    </span>
                                </div>

                                <div className="reservation-details">
                                    <div className="ride-info">
                                        <p><strong>Odjezd:</strong> {formatDate(item.jizda.cas_odjezdu)}</p>
                                        <p><strong>Cena:</strong> {item.jizda.cena} Kč</p>
                                        <p><strong>Řidič:</strong> {item.jizda.ridic?.jmeno || 'Neznámý'}</p>
                                        {item.jizda.auto && (
                                            <p><strong>Auto:</strong> {item.jizda.auto.znacka} {item.jizda.auto.model}</p>
                                        )}
                                    </div>

                                    <ReservationPassengerSummary
                                        reservation={item}
                                        primaryPassengerName={mainPassengerName}
                                        primaryPassengerId={mainPassengerId}
                                        onOpenProfile={() => {
                                            if (mainPassengerId) navigate(`/profil/${mainPassengerId}`);
                                        }}
                                    />

                                    <div className="reservation-note">
                                        <strong>Počet míst:</strong> {item.pocet_mist ?? 1}
                                    </div>

                                    {item.poznamka && (
                                        <div className="reservation-note">
                                            <strong>Poznámka:</strong> {item.poznamka}
                                        </div>
                                    )}
                                </div>

                                <div className="reservation-actions">
                                    {item.typ === 'prijata' && item.status === 'cekajici' && (
                                        <>
                                            <button
                                                className="btn-accept"
                                                onClick={() => handleReservationAction(item.id, 'prijmout')}
                                            >
                                                Přijmout
                                            </button>
                                            <button
                                                className="btn-reject"
                                                onClick={() => handleReservationAction(item.id, 'odmitnout')}
                                            >
                                                Odmítnout
                                            </button>
                                        </>
                                    )}

                                    {item.typ === 'odeslana' &&
                                        item.status === 'cekajici' &&
                                        canCancelReservationByRule(item) && (
                                            <button
                                                className="btn-cancel"
                                                onClick={() => handleCancelReservation(item.id)}
                                            >
                                                Zrušit rezervaci
                                            </button>
                                        )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <ConfirmModal
                isOpen={cancelModal.open}
                title="Zrušit rezervaci"
                message="Opravdu chcete zrušit tuto rezervaci?"
                confirmText="Zrušit rezervaci"
                danger
                onCancel={() => setCancelModal({ open: false, rezervaceId: null })}
                onConfirm={() => {
                    const rezervaceId = cancelModal.rezervaceId;
                    setCancelModal({ open: false, rezervaceId: null });
                    if (rezervaceId) executeCancelReservation(rezervaceId);
                }}
            />
        </div>
    );
};

export default ReservationManager;
