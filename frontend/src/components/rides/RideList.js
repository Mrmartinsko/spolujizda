import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';
import { useNavigate } from 'react-router-dom';

const RideList = ({ rides, onRideUpdate }) => {
  const { token, user } = useAuth();
  const [showReservations, setShowReservations] = useState({});
  const [rezervace, setRezervace] = useState({});
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('cs-CZ');
  };

  const hasNotDepartedYet = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const d = new Date(ride.cas_odjezdu);
    if (Number.isNaN(d.getTime())) return false;
    return d > new Date();
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
      setRezervace((prev) => ({
        ...prev,
        [jizdaId]: response.data.rezervace,
      }));
    } catch (err) {
      console.error('Chyba při načítání rezervací:', err);
      alert(err.response?.data?.error || 'Chyba při načítání rezervací');
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
        await axios.delete(`http://localhost:5000/api/jizdy/${jizdaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        alert('Jízda byla zrušena');
        if (onRideUpdate) onRideUpdate();
      } catch (err) {
        alert(err.response?.data?.error || 'Chyba při rušení jízdy');
      }
    }
  };

  // TODO (později): vyhození pasažéra z jízdy — zatím jen placeholder
  const handleKickPassenger = async (rideId, passengerId) => {
    // až budeš mít endpoint, typicky:
    // await axios.delete(`http://localhost:5000/api/jizdy/${rideId}/pasazeri/${passengerId}`, { headers: { Authorization: `Bearer ${token}` }});
    // if (onRideUpdate) onRideUpdate();
    alert(`TODO: vyhodit uživatele ${passengerId} z jízdy ${rideId}`);
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

        const canCancel = isDriver && isActive;

        // rezervace vidí/řeší jen řidič, jen aktivní, jen před odjezdem
        const canManageReservations = isDriver && isActive && notDeparted;

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

                  {/* ✅ Pasažéři viditelní jen řidiči nebo pasažérovi */}
                  {canSeePassengers && (
                    <div className="ride-info">
                      <strong>Pasažéři:</strong>{' '}
                      {Array.isArray(ride.pasazeri) && ride.pasazeri.length > 0 ? (
                        <div className="passengers-list" onClick={(e) => e.stopPropagation()}>
                          {ride.pasazeri.map((p, idx) => {
                            const passengerId = getPassengerId(p);
                            const key = passengerId ?? `${ride.id}-${idx}`;
                            const name = getPassengerDisplayName(p);
                            const isMe = user && passengerId === user.id;

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

                                {isDriver && passengerId && user && passengerId !== user.id && (
                                  <button
                                    type="button"
                                    className="btn-kick"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleKickPassenger(ride.id, passengerId);
                                    }}
                                    title="Vyhodit z jízdy"
                                  >
                                    Vyhodit
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
    </div>
  );
};

export default RideList;
