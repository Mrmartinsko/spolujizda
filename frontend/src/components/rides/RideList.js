import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../common/ConfirmModal';
import PromptModal from '../common/PromptModal';

const RideList = ({ rides, onRideUpdate }) => {
  const { token, user } = useAuth();
  const [showReservations, setShowReservations] = useState({});
  const [rezervace, setRezervace] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservationModal, setReservationModal] = useState({ open: false, rideId: null });
  const [deleteRideModal, setDeleteRideModal] = useState({ open: false, rideId: null });
  const [kickPassengerModal, setKickPassengerModal] = useState({ open: false, rideId: null, passengerId: null });
  const navigate = useNavigate();
  

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('cs-CZ');
  };
  
  const [expanded, setExpanded] = useState({});
  useEffect(() => {
    if (!rides || rides.length === 0) return;

    const initialExpanded = {};

    rides.forEach((ride) => {
      if (ride.status === 'aktivni') {
        initialExpanded[ride.id] = true;
      }
    });

    setExpanded(initialExpanded);
  }, [rides]);

  const hasNotDepartedYet = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const d = new Date(ride.cas_odjezdu);
    if (Number.isNaN(d.getTime())) return false;
    return d > new Date();
  };

  const canCancelRideByRule = (ride) => {
    if (!ride) return false;
    return ride.status === 'aktivni' && hasNotDepartedYet(ride);
  };

  // vyhození je možné jen do 1 hodiny před odjezdem
  const canKickByTime = (ride) => {
    if (!ride?.cas_odjezdu) return false;

    const departure = new Date(ride.cas_odjezdu);
    if (Number.isNaN(departure.getTime())) return false;

    const limit = new Date(departure.getTime() - 60 * 60 * 1000); // -1 hodina
    return new Date() <= limit;
  };

  const getRideRouteText = (ride) => {
    const stops = (ride.mezistanice || [])
      .slice()
      .sort((a, b) => (a.poradi ?? 0) - (b.poradi ?? 0))
      .map((s) => s.misto)
      .filter(Boolean);

    return [ride.odkud, ...stops, ride.kam].filter(Boolean).join(' → ');
  };

  const toggleExpanded = (rideId) => {
    setExpanded((prev) => ({ ...prev, [rideId]: !prev[rideId] }));
  };

  const getPassengerId = (p) => p?.uzivatel_id ?? p?.id ?? null;

  const getPassengerDisplayName = (p) => {
    if (!p) return 'Neznámý uživatel';
    const fullName = [p.jmeno, p.prijmeni].filter(Boolean).join(' ').trim();
    return fullName || p.prezdivka || p.username || 'Neznámý uživatel';
  };

  const submitReservation = async (jizdaId, poznamka = '') => {
    try {
      setError('');
      setSuccess('');

      await axios.post(
        'http://localhost:5000/api/rezervace/',
        { jizda_id: jizdaId, poznamka },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Rezervace byla odeslána!');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při rezervaci');
    }
  };

  const handleReservation = (jizdaId) => {
    setReservationModal({ open: true, rideId: jizdaId });
  };

  const fetchReservations = async (jizdaId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/rezervace/jizda/${jizdaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRezervace((prev) => ({
        ...prev,
        [jizdaId]: response.data.rezervace,
      }));
    } catch (err) {
      console.error('Chyba při načítání rezervací:', err);
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při načítání rezervací');
    }
  };

  const toggleReservations = async (ride) => {
    // ✅ rezervace řeší jen řidič, jen aktivní, jen před odjezdem
    const isActive = ride.status === 'aktivni';
    const notDeparted = hasNotDepartedYet(ride);
    const isDriver = user && ride.ridic_id === user.id;

    const canManageReservations = isDriver && isActive && notDeparted;
    if (!canManageReservations) return;

    const jizdaId = ride.id;
    const isShowing = showReservations[jizdaId];

    setShowReservations((prev) => ({
      ...prev,
      [jizdaId]: !isShowing,
    }));

    if (!isShowing && !rezervace[jizdaId]) {
      await fetchReservations(jizdaId);
    }
  };

  const handleReservationAction = async (rezervaceId, action, jizdaId) => {
    try {
      setError('');
      setSuccess('');
      await axios.post(
        `http://localhost:5000/api/rezervace/${rezervaceId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Rezervace byla ${action === 'prijmout' ? 'přijata' : 'odmítnuta'}`);
      await fetchReservations(jizdaId);
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || `Chyba při ${action} rezervace`);
    }
  };

  const executeDeleteRide = async (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('Jízdu lze zrušit jen pokud je aktivní a před odjezdem.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await axios.delete(`http://localhost:5000/api/jizdy/${jizdaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Jízda byla zrušena');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při rušení jízdy');
    }
  };

  const handleDeleteRide = (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('Jízdu lze zrušit jen pokud je aktivní a před odjezdem.');
      return;
    }
    setDeleteRideModal({ open: true, rideId: jizdaId });
  };

  const executeKickPassenger = async (rideId, passengerId) => {
    try {
      setError('');
      setSuccess('');
      await axios.delete(
        `http://localhost:5000/api/jizdy/${rideId}/pasazeri/${passengerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Pasažér byl vyhozen.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při vyhazování pasažéra');
    }
  };

  const handleKickPassenger = (rideId, passengerId) => {
    setKickPassengerModal({ open: true, rideId, passengerId });
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
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {rides.map((ride) => {
        const isExpanded = !!expanded[ride.id];

        const isActive = ride.status === 'aktivni';
        const notDeparted = hasNotDepartedYet(ride);
        const isDriver = user && ride.ridic_id === user.id;

        const isPassenger =
          user &&
          Array.isArray(ride.pasazeri) &&
          ride.pasazeri.some((p) => getPassengerId(p) === user.id);

        const canSeePassengers = isDriver || isPassenger;

        const canReserve =
          user &&
          ride.ridic_id !== user.id &&
          isActive &&
          notDeparted &&
          ride.volna_mista > 0;

        const canEdit = isDriver && isActive && notDeparted;

        const canCancel = isDriver && isActive && notDeparted;

        // rezervace vidí/řeší jen řidič, jen aktivní, jen před odjezdem
        const canManageReservations = isDriver && isActive && notDeparted;

        // podmínka pro vyhazování (UI)
        const timeOkForKick = canKickByTime(ride);
        const canKickPassengersUi = isDriver && isActive && timeOkForKick;

        return (
          <div key={ride.id} className={`ride-card ${isExpanded ? 'expanded' : ''}`}>
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
                    <button
                      type="button"
                      className="driver-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profil/${ride.ridic_id}`);
                      }}
                      title="Otevřít profil řidiče"
                    >
                      {ride.ridic?.jmeno || 'Neznámý'}
                    </button>
                  </div>

                  {ride.auto && (
                    <div className="ride-info">
                      <strong>Auto:</strong>{' '}
                      {ride.auto.smazane ? (
                        'Smazané auto'
                      ) : (
                        <>
                          {ride.auto.znacka}
                          {ride.auto.model && ` ${ride.auto.model}`}
                          {ride.auto.spz && ` (${ride.auto.spz})`}
                        </>
                      )}
                    </div>
                  )}

                  {ride.mezistanice && ride.mezistanice.length > 0 && (
                    <div className="ride-info">
                      <strong>Mezistanice:</strong>{' '}
                      {ride.mezistanice
                        .slice()
                        .sort((a, b) => a.poradi - b.poradi)
                        .map((m) => m.misto)
                        .join(' → ')}
                    </div>
                  )}

                  {/*  Pasažéři viditelní jen řidiči nebo pasažérovi */}
                  {canSeePassengers && (
                    <div className="ride-info">
                      <strong>Pasažéři:</strong>{' '}
                      {Array.isArray(ride.pasazeri) && ride.pasazeri.length > 0 ? (
                        <>
                          <div className="passengers-list" onClick={(e) => e.stopPropagation()}>
                            {ride.pasazeri.map((p, idx) => {
                              const passengerId = getPassengerId(p);
                              const key = passengerId ?? `${ride.id}-${idx}`;
                              const name = getPassengerDisplayName(p);
                              const isMe = user && passengerId === user.id;

                              const showKick = isDriver && passengerId && passengerId !== user?.id;
                              const kickDisabled = !canKickPassengersUi;

                              const kickTitle = !isActive
                                ? 'Pasažéra lze vyhodit jen u aktivní jízdy.'
                                : !timeOkForKick
                                ? 'Pasažéra lze vyhodit nejpozději 1 hodinu před odjezdem.'
                                : 'Vyhodit z jízdy';

                              return (
                                <div key={key} className="passenger-item">
                                  <button
                                    type="button"
                                    className={`passenger-pill ${isMe ? 'me' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (passengerId) navigate(`/profil/${passengerId}`);
                                    }}
                                    title="Otevřít profil"
                                  >
                                    {name}
                                    {isMe ? ' (ty)' : ''}
                                  </button>

                                  {showKick && (
                                    <button
                                      type="button"
                                      className={`btn-kick ${kickDisabled ? 'disabled' : ''}`}
                                      disabled={kickDisabled}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (kickDisabled) return;
                                        handleKickPassenger(ride.id, passengerId);
                                      }}
                                      title={kickTitle}
                                    >
                                      Vyhodit
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* hláška pro řidiče, když je vyhazování omezené */}
                          {isDriver && (!isActive || !timeOkForKick) && (
                            <div className="kick-hint">
                              {!isActive
                                ? 'Vyhazování pasažérů je možné jen u aktivní jízdy.'
                                : 'Vyhazování pasažérů je možné nejpozději 1 hodinu před odjezdem.'}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="muted">Žádní</span>
                      )}
                    </div>
                  )}

                  <div className="ride-status">
                    <strong>Status:</strong>{' '}
                    <span className={`status ${ride.status}`}>{ride.status}</span>
                  </div>
                </div>

                <div className="ride-actions" onClick={(e) => e.stopPropagation()}>
                  {canReserve && (
                    <button className="btn-reserve" onClick={() => handleReservation(ride.id)}>
                      Rezervovat
                    </button>
                  )}

                  {isDriver && (
                    <>
                      {canManageReservations && (
                        <button className="btn-reservations" onClick={() => toggleReservations(ride)}>
                          {showReservations[ride.id] ? 'Skrýt rezervace' : 'Zobrazit rezervace'}
                          {rezervace[ride.id] && ` (${rezervace[ride.id].length})`}
                        </button>
                      )}

                      {canEdit && (
                        <button className="btn-edit" onClick={() => navigate(`/jizdy/${ride.id}/upravit`)}>
                          Upravit
                        </button>
                      )}

                      {canCancel && (
                        <button className="btn-delete" onClick={() => handleDeleteRide(ride.id)}>
                          Zrušit jízdu
                        </button>
                      )}
                    </>
                  )}
                </div>

                {canManageReservations && showReservations[ride.id] && (
                  <div className="reservations-section" onClick={(e) => e.stopPropagation()}>
                    <h4>Rezervace na tuto jízdu:</h4>

                    {rezervace[ride.id] && rezervace[ride.id].length > 0 ? (
                      <div className="reservations-list">
                        {rezervace[ride.id].map((r) => (
                          <div key={r.id} className="reservation-item">
                            <div className="reservation-info">
                              <div className="passenger-name">
                                <strong>{r.uzivatel?.jmeno || 'Neznámý uživatel'}</strong>
                              </div>
                              <div className="reservation-status">{r.status}</div>
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
      <PromptModal
        isOpen={reservationModal.open}
        title="Odeslat rezervaci"
        message="Můžete přidat poznámku pro řidiče (volitelné)."
        label="Poznámka"
        placeholder="Např. nastoupím na druhé zastávce"
        confirmText="Odeslat rezervaci"
        onCancel={() => setReservationModal({ open: false, rideId: null })}
        onConfirm={(value) => {
          const rideId = reservationModal.rideId;
          setReservationModal({ open: false, rideId: null });
          if (rideId) submitReservation(rideId, value?.trim() || '');
        }}
      />
      <ConfirmModal
        isOpen={deleteRideModal.open}
        title="Zrušit jízdu"
        message="Opravdu chcete zrušit tuto jízdu?"
        confirmText="Zrušit jízdu"
        danger
        onCancel={() => setDeleteRideModal({ open: false, rideId: null })}
        onConfirm={() => {
          const rideId = deleteRideModal.rideId;
          setDeleteRideModal({ open: false, rideId: null });
          if (rideId) executeDeleteRide(rideId);
        }}
      />
      <ConfirmModal
        isOpen={kickPassengerModal.open}
        title="Vyhodit pasažéra"
        message="Opravdu vyhodit pasažéra z jízdy?"
        confirmText="Vyhodit"
        danger
        onCancel={() => setKickPassengerModal({ open: false, rideId: null, passengerId: null })}
        onConfirm={() => {
          const { rideId, passengerId } = kickPassengerModal;
          setKickPassengerModal({ open: false, rideId: null, passengerId: null });
          if (rideId && passengerId) executeKickPassenger(rideId, passengerId);
        }}
      />
    </div>
  );
};

export default RideList;
