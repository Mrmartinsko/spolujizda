import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './RideList.css';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../common/ConfirmModal';
import ReservationPassengerSummary from '../reservations/ReservationPassengerSummary';

const API = 'http://localhost:5000/api';

const emptyReservationModal = {
  open: false,
  rideId: null,
  pocet_mist: 1,
  max_mist: 1,
  dalsi_pasazeri: [],
  poznamka: '',
};

const RideList = ({ rides, onRideUpdate, defaultReservationMist = 1 }) => {
  const { token, user } = useAuth();
  const [showReservations, setShowReservations] = useState({});
  const [rezervace, setRezervace] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservationModal, setReservationModal] = useState(emptyReservationModal);
  const [deleteRideModal, setDeleteRideModal] = useState({ open: false, rideId: null });
  const [kickPassengerModal, setKickPassengerModal] = useState({ open: false, rideId: null, passengerId: null });
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!user || !rides || rides.length === 0) return;

    rides.forEach((ride) => {
      const isDriver = ride.ridic_id === user.id;
      const isExpanded = !!expanded[ride.id];

      if (isDriver && isExpanded && rezervace[ride.id] === undefined) {
        fetchReservations(ride.id);
      }
    });
  }, [expanded, rezervace, rides, user]);

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('cs-CZ');
  };

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

  const canKickByTime = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const departure = new Date(ride.cas_odjezdu);
    if (Number.isNaN(departure.getTime())) return false;
    const limit = new Date(departure.getTime() - 60 * 60 * 1000);
    return new Date() <= limit;
  };

  const getRideRouteText = (ride) => {
    const stops = (ride.mezistanice || [])
      .slice()
      .sort((a, b) => (a.poradi ?? 0) - (b.poradi ?? 0))
      .map((s) => s.misto)
      .filter(Boolean);

    return [ride.odkud, ...stops, ride.kam].filter(Boolean).join(' -> ');
  };

  const toggleExpanded = async (ride) => {
    const nextExpanded = !expanded[ride.id];
    setExpanded((prev) => ({ ...prev, [ride.id]: nextExpanded }));

    const isDriver = user && ride.ridic_id === user.id;
    if (nextExpanded && isDriver && !rezervace[ride.id]) {
      await fetchReservations(ride.id);
    }
  };

  const getPassengerId = (p) => p?.uzivatel_id ?? p?.id ?? null;

  const getPassengerDisplayName = (p) => {
    if (!p) return 'Neznamy uzivatel';
    const fullName = [p.jmeno, p.prijmeni].filter(Boolean).join(' ').trim();
    return fullName || p.prezdivka || p.username || 'Neznamy uzivatel';
  };

  const submitReservation = async (
    jizdaId,
    pocetMist = 1,
    poznamka = '',
    dalsiPasazeri = []
  ) => {
    try {
      setError('');
      setSuccess('');

      await axios.post(
        `${API}/rezervace/`,
        { jizda_id: jizdaId, pocet_mist: pocetMist, dalsi_pasazeri: dalsiPasazeri, poznamka },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Rezervace byla odeslana.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba pri rezervaci');
    }
  };

  const handleReservation = (ride) => {
    const vychoziPocetMist = Math.max(1, Math.min(defaultReservationMist || 1, ride.volna_mista || 1));
    setReservationModal({
      open: true,
      rideId: ride.id,
      pocet_mist: vychoziPocetMist,
      max_mist: Math.max(1, ride.volna_mista || 1),
      dalsi_pasazeri: Array.from({ length: Math.max(0, vychoziPocetMist - 1) }, () => ''),
      poznamka: '',
    });
  };

  const updateReservationModal = (field, value) => {
    setReservationModal((prev) => {
      if (field === 'pocet_mist') {
        const parsedValue = Number(value);
        const nextCount = Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : value;
        const companionCount = Number.isInteger(parsedValue) && parsedValue > 1 ? parsedValue - 1 : 0;
        const dalsiPasazeri = prev.dalsi_pasazeri.slice(0, companionCount);

        while (dalsiPasazeri.length < companionCount) {
          dalsiPasazeri.push('');
        }

        return { ...prev, pocet_mist: nextCount, dalsi_pasazeri: dalsiPasazeri };
      }

      return { ...prev, [field]: value };
    });
  };

  const updateAdditionalPassenger = (index, value) => {
    setReservationModal((prev) => {
      const dalsiPasazeri = [...prev.dalsi_pasazeri];
      dalsiPasazeri[index] = value;
      return { ...prev, dalsi_pasazeri: dalsiPasazeri };
    });
  };

  const closeReservationModal = () => {
    setReservationModal(emptyReservationModal);
  };

  const fetchReservations = async (jizdaId) => {
    try {
      const response = await axios.get(
        `${API}/rezervace/jizda/${jizdaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRezervace((prev) => ({
        ...prev,
        [jizdaId]: response.data.rezervace,
      }));
    } catch (err) {
      console.error('Chyba pri nacitani rezervaci:', err);
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba pri nacitani rezervaci');
    }
  };

  const toggleReservations = async (ride) => {
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
        `${API}/rezervace/${rezervaceId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Rezervace byla ${action === 'prijmout' ? 'prijata' : 'odmitnuta'}`);
      await fetchReservations(jizdaId);
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || `Chyba pri ${action} rezervace`);
    }
  };

  const executeDeleteRide = async (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('Jizdu lze zrusit jen pokud je aktivni a pred odjezdem.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await axios.delete(`${API}/jizdy/${jizdaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Jizda byla zrusena');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba pri ruseni jizdy');
    }
  };

  const handleDeleteRide = (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('Jizdu lze zrusit jen pokud je aktivni a pred odjezdem.');
      return;
    }
    setDeleteRideModal({ open: true, rideId: jizdaId });
  };

  const executeKickPassenger = async (rideId, passengerId) => {
    try {
      setError('');
      setSuccess('');
      await axios.delete(
        `${API}/jizdy/${rideId}/pasazeri/${passengerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Pasazer byl vyhozen.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba pri vyhazovani pasazera');
    }
  };

  const handleKickPassenger = (rideId, passengerId) => {
    setKickPassengerModal({ open: true, rideId, passengerId });
  };

  if (!rides || rides.length === 0) {
    return (
      <div className="ride-list">
        <p className="no-rides">Zadne jizdy nenalezeny</p>
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
        const canManageReservations = isDriver && isActive && notDeparted;
        const rezervaceJizdy = rezervace[ride.id] || [];
        const prijateRezervaceJizdy = rezervaceJizdy.filter((r) => r.status === 'prijata');
        const prijataMista = rezervaceJizdy
          .filter((r) => r.status === 'prijata')
          .reduce((sum, r) => sum + (Number(r.pocet_mist) || 1), 0);
        const volnaMistaProRezervace =
          rezervace[ride.id] !== undefined
            ? Math.max(0, ride.pocet_mist - prijataMista)
            : Math.max(0, ride.volna_mista ?? 0);

        const timeOkForKick = canKickByTime(ride);
        const canKickPassengersUi = isDriver && isActive && timeOkForKick;

        return (
          <div key={ride.id} className={`ride-card ${isExpanded ? 'expanded' : ''}`}>
            <button
              type="button"
              className="ride-header ride-header-btn"
              onClick={() => toggleExpanded(ride)}
            >
              <h3 className="ride-route">{getRideRouteText(ride)}</h3>
              <div className="ride-header-right">
                <span className="ride-price">{ride.cena} Kc</span>
                <span className={`chevron ${isExpanded ? 'open' : ''}`}>v</span>
              </div>
            </button>

            {isExpanded && (
              <>
                <div className="ride-details">
                  <div className="ride-time">
                    <strong>Odjezd:</strong> {formatDate(ride.cas_odjezdu)}
                  </div>
                  <div className="ride-time">
                    <strong>Prijezd:</strong> {formatDate(ride.cas_prijezdu)}
                  </div>

                  <div className="ride-info">
                    <strong>Volna mista:</strong> {ride.volna_mista} / {ride.pocet_mist}
                  </div>

                  <div className="ride-info">
                    <strong>Ridic:</strong>{' '}
                    <button
                      type="button"
                      className="driver-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profil/${ride.ridic_id}`);
                      }}
                      title="Otevrit profil ridice"
                    >
                      {ride.ridic?.jmeno || 'Neznamy'}
                    </button>
                  </div>

                  <div className="ride-info">
                    <strong>Cekajicich:</strong> {ride.pocet_cekajicich_rezervaci ?? 0}
                  </div>

                  {ride.auto && (
                    <div className="ride-info">
                      <strong>Auto:</strong>{' '}
                      {ride.auto.smazane ? (
                        'Smazane auto'
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
                        .join(' -> ')}
                    </div>
                  )}

                  {canSeePassengers && (
                    <div className="ride-info">
                      <strong>Pasazeri:</strong>{' '}
                      {(isDriver && rezervace[ride.id] !== undefined
                        ? prijateRezervaceJizdy.length > 0
                        : Array.isArray(ride.pasazeri) && ride.pasazeri.length > 0) ? (
                        <>
                          <div className="passengers-list" onClick={(e) => e.stopPropagation()}>
                            {isDriver && rezervace[ride.id] !== undefined
                              ? prijateRezervaceJizdy.map((rez) => {
                                  const passengerId = rez.uzivatel?.id ?? rez.uzivatel_id;
                                  const key = rez.id;
                                  const name = getPassengerDisplayName(rez.uzivatel);
                                  const isMe = user && passengerId === user.id;
                                  const showKick = passengerId && passengerId !== user?.id;
                                  const kickDisabled = !canKickPassengersUi;

                                  const kickTitle = !isActive
                                    ? 'Pasazera lze vyhodit jen u aktivni jizdy.'
                                    : !timeOkForKick
                                    ? 'Pasazera lze vyhodit nejpozdeji 1 hodinu pred odjezdem.'
                                    : 'Vyhodit z jizdy';

                                  return (
                                    <div key={key} className="passenger-item reservation-entry">
                                      <ReservationPassengerSummary
                                        reservation={rez}
                                        primaryPassengerName={`${name}${isMe ? ' (ty)' : ''}`}
                                        primaryPassengerId={passengerId}
                                        onOpenProfile={(e) => {
                                          e?.stopPropagation?.();
                                          if (passengerId) navigate(`/profil/${passengerId}`);
                                        }}
                                      />

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
                                })
                              : ride.pasazeri.map((p, idx) => {
                                  const passengerId = getPassengerId(p);
                                  const key = passengerId ?? `${ride.id}-${idx}`;
                                  const name = getPassengerDisplayName(p);
                                  const isMe = user && passengerId === user.id;
                                  const showKick = isDriver && passengerId && passengerId !== user?.id;
                                  const kickDisabled = !canKickPassengersUi;

                                  const kickTitle = !isActive
                                    ? 'Pasazera lze vyhodit jen u aktivni jizdy.'
                                    : !timeOkForKick
                                    ? 'Pasazera lze vyhodit nejpozdeji 1 hodinu pred odjezdem.'
                                    : 'Vyhodit z jizdy';

                                  return (
                                    <div key={key} className="passenger-item">
                                      <button
                                        type="button"
                                        className={`passenger-pill ${isMe ? 'me' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (passengerId) navigate(`/profil/${passengerId}`);
                                        }}
                                        title="Otevrit profil"
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

                          {isDriver && (!isActive || !timeOkForKick) && (
                            <div className="kick-hint">
                              {!isActive
                                ? 'Vyhazovani pasazeru je mozne jen u aktivni jizdy.'
                                : 'Vyhazovani pasazeru je mozne nejpozdeji 1 hodinu pred odjezdem.'}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="muted">Zadni</span>
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
                    <button className="btn-reserve" onClick={() => handleReservation(ride)}>
                      Rezervovat
                    </button>
                  )}

                  {isDriver && (
                    <>
                      {canManageReservations && (
                        <button className="btn-reservations" onClick={() => toggleReservations(ride)}>
                          {showReservations[ride.id] ? 'Skryt rezervace' : 'Zobrazit rezervace'}
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
                          Zrusit jizdu
                        </button>
                      )}
                    </>
                  )}
                </div>

                {canManageReservations && showReservations[ride.id] && (
                  <div className="reservations-section" onClick={(e) => e.stopPropagation()}>
                    <h4>Rezervace na tuto jizdu:</h4>

                    {rezervaceJizdy.length > 0 ? (
                      <div className="reservations-list">
                        {rezervaceJizdy.map((r) => {
                          const canAcceptThisReservation =
                            canManageReservations &&
                            volnaMistaProRezervace >= (Number(r.pocet_mist) || 1);
                          const primaryPassengerName = getPassengerDisplayName(r.uzivatel);
                          const primaryPassengerId = r.uzivatel?.id;

                          return (
                            <div key={r.id} className="reservation-item">
                              <div className="reservation-info">
                                <ReservationPassengerSummary
                                  reservation={r}
                                  primaryPassengerName={primaryPassengerName}
                                  primaryPassengerId={primaryPassengerId}
                                  onOpenProfile={(e) => {
                                    e?.stopPropagation?.();
                                    if (primaryPassengerId) navigate(`/profil/${primaryPassengerId}`);
                                  }}
                                />
                                <div className="reservation-status">{r.status}</div>
                                <div className="reservation-note">
                                  <strong>Mist:</strong> {r.pocet_mist ?? 1}
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
                                    disabled={!canAcceptThisReservation}
                                    onClick={() => handleReservationAction(r.id, 'prijmout', ride.id)}
                                    title={!canAcceptThisReservation ? 'Jizda nema dost volnych mist' : 'Prijmout rezervaci'}
                                  >
                                    Prijmout
                                  </button>
                                  <button
                                    className="btn-reject"
                                    onClick={() => handleReservationAction(r.id, 'odmitnout', ride.id)}
                                  >
                                    Odmitnout
                                  </button>
                                </div>
                              )}

                              {r.status === 'cekajici' && !canAcceptThisReservation && (
                                <div className="reservation-note">
                                  <em>Pro tuto rezervaci uz neni dost volnych mist.</em>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-reservations">Zadne rezervace na tuto jizdu</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {reservationModal.open && (
        <div className="app-modal-overlay" onClick={closeReservationModal}>
          <div className="app-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="app-modal-title">Potvrdit rezervaci</h3>
            <p className="app-modal-message">
              Vyberte pocet mist a pripadne pridejte poznamku pro ridice. Rezervace se odesle az po potvrzeni.
            </p>

            <label className="app-modal-label">Pocet mist</label>
            <input
              type="number"
              className="reservation-modal-input"
              min="1"
              max={reservationModal.max_mist}
              value={reservationModal.pocet_mist}
              onChange={(e) => updateReservationModal('pocet_mist', e.target.value)}
            />

            {reservationModal.dalsi_pasazeri.map((jmeno, index) => (
              <div key={index} className="reservation-modal-passenger-group">
                <label className="app-modal-label">Jmeno pasazera {index + 2}</label>
                <input
                  type="text"
                  className="reservation-modal-input"
                  value={jmeno}
                  maxLength={80}
                  onChange={(e) => updateAdditionalPassenger(index, e.target.value)}
                />
              </div>
            ))}

            <label className="app-modal-label">Poznamka</label>
            <textarea
              className="app-modal-textarea"
              value={reservationModal.poznamka}
              onChange={(e) => updateReservationModal('poznamka', e.target.value)}
              placeholder="Napr. nastoupim na druhe zastavce"
              rows={3}
            />

            <div className="app-modal-actions">
              <button type="button" className="app-btn app-btn-secondary" onClick={closeReservationModal}>
                Zrusit
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary"
                onClick={() => {
                  const rideId = reservationModal.rideId;
                  const pocetMist = Number(reservationModal.pocet_mist);
                  const maxMist = Number(reservationModal.max_mist);
                  const dalsiPasazeri = reservationModal.dalsi_pasazeri.map((name) => name.trim());

                  if (!rideId) return;
                  if (!Number.isInteger(pocetMist) || pocetMist <= 0) {
                    setError('Pocet mist musi byt alespon 1.');
                    return;
                  }
                  if (pocetMist > maxMist) {
                    setError('Pocet mist nesmi byt vyssi nez aktualne volna kapacita.');
                    return;
                  }
                  if (dalsiPasazeri.length !== Math.max(0, pocetMist - 1)) {
                    setError('Pocet jmen doprovodu nesouhlasi s poctem mist.');
                    return;
                  }
                  if (dalsiPasazeri.some((name) => !name)) {
                    setError('Vyplnte jmena vsech dalsich pasazeru.');
                    return;
                  }

                  closeReservationModal();
                  submitReservation(
                    rideId,
                    pocetMist,
                    reservationModal.poznamka.trim(),
                    dalsiPasazeri
                  );
                }}
              >
                Potvrdit rezervaci
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteRideModal.open}
        title="Zrusit jizdu"
        message="Opravdu chcete zrusit tuto jizdu?"
        confirmText="Zrusit jizdu"
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
        title="Vyhodit pasazera"
        message="Opravdu vyhodit pasazera z jizdy?"
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
