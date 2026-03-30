import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/common/ConfirmModal';
import ReservationPassengerSummary from '../components/reservations/ReservationPassengerSummary';
import './MyReservationsPage.css';

const TEXT = {
  loadError: 'Rezervace se nepodařilo načíst.',
  cancelRuleError: 'Rezervaci lze zrušit jen u aktivní jízdy před odjezdem.',
  cancelSuccess: 'Rezervace byla zrušena.',
  cancelError: 'Zrušení rezervace se nepovedlo.',
  waiting: 'Čekající',
  accepted: 'Přijatá',
  rejected: 'Odmítnutá',
  canceled: 'Zrušená',
  active: 'Aktivní',
  completed: 'Dokončená',
  unknownStatus: 'Neznámý stav',
  unknownUser: 'Neznámý uživatel',
  noPassengers: 'Žádní pasažéři',
  loading: 'Načítám rezervace...',
  title: 'Moje rezervace',
  subtitle: 'Aktivní a čekající rezervace máte vždy nahoře, aby byly po ruce bez zbytečného hledání.',
  retry: 'Zkusit znovu',
  all: 'Všechny',
  emptyAll: 'Zatím nemáte žádné rezervace.',
  unknownPlace: 'Neznámé místo',
  departure: 'Odjezd',
  arrival: 'Příjezd',
  freeSeats: 'Volná místa',
  queuedCount: 'Čekajících',
  waypoints: 'Mezizastávky',
  noWaypoints: 'Žádné mezistanice',
  driver: 'Řidič',
  car: 'Auto',
  notProvided: 'Neuvedeno',
  unknown: 'Neznámý',
  passengers: 'Pasažéři',
  reservationFor: 'Rezervace pro:',
  rideStatus: 'Stav jízdy:',
  seatCount: 'Počet míst:',
  queuePosition: 'Pořadí ve frontě:',
  note: 'Poznámka:',
  confirmed: 'Rezervace je potvrzená.',
  wasRejected: 'Rezervace byla odmítnuta.',
  wasCanceled: 'Rezervace byla zrušena.',
  cancelReservation: 'Zrušit rezervaci',
  confirmCancelTitle: 'Zrušit rezervaci',
  confirmCancelMessage: 'Opravdu chcete zrušit tuto rezervaci?',
};

const DASH = '—';

const hasNotDepartedYetForSort = (ride) => {
  if (!ride?.cas_odjezdu) return false;
  const departure = new Date(ride.cas_odjezdu);
  if (Number.isNaN(departure.getTime())) return false;
  return departure > new Date();
};

const getReservationPriorityValue = (item, focusReservationId, focusRideId) => {
  const isFocused =
    (focusReservationId && item.id === focusReservationId) ||
    (focusRideId && item.jizda_id === focusRideId);
  if (isFocused) return 0;

  const rideStatus = item.jizda?.status;
  const rideActive = rideStatus === 'aktivni';
  const notDeparted = hasNotDepartedYetForSort(item.jizda);

  if (rideActive && item.status === 'prijata' && notDeparted) return 1;
  if (rideActive && item.status === 'cekajici' && notDeparted) return 2;
  if (rideActive && notDeparted) return 3;
  if (rideStatus === 'dokoncena') return 4;
  if (item.status === 'odmitnuta') return 5;
  if (item.status === 'zrusena' || rideStatus === 'zrusena') return 6;
  return 7;
};

const MyReservationsPage = () => {
  const { token, user } = useAuth();
  const [rezervace, setRezervace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelModal, setCancelModal] = useState({ open: false, rezervaceId: null });
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const focusReservationId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('focusReservation');
    return raw ? Number(raw) : null;
  }, [location.search]);

  const focusRideId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('focusRide');
    return raw ? Number(raw) : null;
  }, [location.search]);

  useEffect(() => {
    if (token) fetchRezervace();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchRezervace = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/rezervace/moje', { headers });
      const raw = Array.isArray(response.data) ? response.data : response.data?.rezervace || [];
      const moje = raw.filter((item) => !item.typ || item.typ === 'odeslana');
      setRezervace(moje);
    } catch (requestError) {
      setError(TEXT.loadError);
      console.error(requestError.response?.data || requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const hasNotDepartedYet = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const departure = new Date(ride.cas_odjezdu);
    if (Number.isNaN(departure.getTime())) return false;
    return departure > new Date();
  };

  const canCancelReservationByRule = (reservation) => {
    if (!reservation?.jizda) return false;
    return reservation.jizda.status === 'aktivni' && hasNotDepartedYet(reservation.jizda);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'cekajici':
        return '#b77515';
      case 'prijata':
        return '#177d52';
      case 'odmitnuta':
        return '#c7415f';
      case 'zrusena':
        return '#6f7c93';
      default:
        return '#4067ff';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'cekajici':
        return TEXT.waiting;
      case 'prijata':
        return TEXT.accepted;
      case 'odmitnuta':
        return TEXT.rejected;
      case 'zrusena':
        return TEXT.canceled;
      default:
        return status || TEXT.unknownStatus;
    }
  };

  const getRideStatusText = (status) => {
    switch (status) {
      case 'aktivni':
        return TEXT.active;
      case 'zrusena':
        return TEXT.canceled;
      case 'dokoncena':
        return TEXT.completed;
      default:
        return status || TEXT.unknownStatus;
    }
  };

  const getPassengerId = (passenger) => passenger?.uzivatel_id ?? passenger?.id ?? null;

  const getPassengerDisplayName = (passenger) => {
    if (!passenger) return TEXT.unknownUser;
    const fullName = [passenger.jmeno, passenger.prijmeni].filter(Boolean).join(' ').trim();
    return fullName || passenger.prezdivka || passenger.username || TEXT.unknownUser;
  };

  const canSeePassengers = (ride) => {
    if (!ride || !user) return false;
    const isDriver = ride.ridic_id === user.id || ride.ridic?.id === user.id;
    const isPassenger = Array.isArray(ride.pasazeri) && ride.pasazeri.some((p) => getPassengerId(p) === user.id);
    return isDriver || isPassenger;
  };

  const formatDate = (dateString) => {
    if (!dateString) return DASH;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return DASH;
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCompactDate = (dateString) => {
    if (!dateString) return DASH;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return DASH;
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedRezervace = useMemo(() => {
    return [...rezervace].sort((a, b) => {
      const priorityDiff =
        getReservationPriorityValue(a, focusReservationId, focusRideId) -
        getReservationPriorityValue(b, focusReservationId, focusRideId);
      if (priorityDiff !== 0) return priorityDiff;

      const aDeparture = a.jizda?.cas_odjezdu ? new Date(a.jizda.cas_odjezdu).getTime() : 0;
      const bDeparture = b.jizda?.cas_odjezdu ? new Date(b.jizda.cas_odjezdu).getTime() : 0;
      if (aDeparture !== bDeparture) return bDeparture - aDeparture;

      return (b.id || 0) - (a.id || 0);
    });
  }, [focusReservationId, focusRideId, rezervace]);

  useEffect(() => {
    if (!sortedRezervace.length) {
      setExpanded({});
      return;
    }

    const initialExpanded = {};
    let matchedStatus = null;

    sortedRezervace.forEach((reservation, index) => {
      const isFocused =
        (focusReservationId && reservation.id === focusReservationId) ||
        (focusRideId && reservation.jizda_id === focusRideId);

      initialExpanded[reservation.id] =
        isFocused ||
        (index === 0 && getReservationPriorityValue(reservation, focusReservationId, focusRideId) <= 3);

      if (isFocused) matchedStatus = reservation.status;
    });

    setExpanded(initialExpanded);
    if (matchedStatus) {
      setFilter((prev) => (prev === matchedStatus ? prev : matchedStatus));
    }
  }, [focusReservationId, focusRideId, sortedRezervace]);

  const executeCancelReservation = async (rezervaceId) => {
    const target = rezervace.find((item) => item.id === rezervaceId);
    if (!canCancelReservationByRule(target)) {
      setSuccess('');
      setError(TEXT.cancelRuleError);
      return;
    }

    try {
      setError('');
      setSuccess('');
      await axios.delete(`http://localhost:5000/api/rezervace/${rezervaceId}/zrusit`, { headers });
      setSuccess(TEXT.cancelSuccess);
      fetchRezervace();
    } catch (requestError) {
      setSuccess('');
      setError(requestError.response?.data?.error || TEXT.cancelError);
    }
  };

  const handleCancelReservation = (rezervaceId) => {
    const target = rezervace.find((item) => item.id === rezervaceId);
    if (!canCancelReservationByRule(target)) {
      setSuccess('');
      setError(TEXT.cancelRuleError);
      return;
    }
    setCancelModal({ open: true, rezervaceId });
  };

  const toggleExpanded = (rezervaceId) => {
    setExpanded((prev) => ({ ...prev, [rezervaceId]: !prev[rezervaceId] }));
  };

  const renderPassengers = (ride) => {
    if (!ride || !canSeePassengers(ride)) return <span>{TEXT.noPassengers}</span>;

    const passengers = Array.isArray(ride.pasazeri) ? ride.pasazeri : [];
    if (passengers.length === 0) {
      return <span>{TEXT.noPassengers}</span>;
    }

    return (
      <div className="passengers-list">
        {passengers.map((passenger, index) => {
          const passengerId = getPassengerId(passenger);
          const key = passengerId ?? `${ride.id}-${index}`;
          const name = getPassengerDisplayName(passenger);
          const isMe = user && passengerId === user.id;

          return (
            <button
              key={key}
              type="button"
              className={`passenger-pill ${isMe ? 'me' : ''}`}
              onClick={() => passengerId && navigate(`/profil/${passengerId}`)}
              title="Otevřít profil pasažéra"
            >
              {name}
              {isMe ? ' (ty)' : ''}
            </button>
          );
        })}
      </div>
    );
  };

  const filteredRezervace = sortedRezervace.filter((reservation) => {
    if (filter === 'all') return true;
    return reservation.status === filter;
  });

  const counts = {
    all: rezervace.length,
    cekajici: rezervace.filter((item) => item.status === 'cekajici').length,
    prijata: rezervace.filter((item) => item.status === 'prijata').length,
    odmitnuta: rezervace.filter((item) => item.status === 'odmitnuta').length,
    zrusena: rezervace.filter((item) => item.status === 'zrusena').length,
  };

  if (loading) {
    return (
      <div className="my-reservations-page">
        <div className="loading">{TEXT.loading}</div>
      </div>
    );
  }

  return (
    <div className="my-reservations-page">
      <div className="page-header">
        <h1>{TEXT.title}</h1>
        <p>{TEXT.subtitle}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchRezervace} className="retry-btn">
            {TEXT.retry}
          </button>
        </div>
      )}
      {success && <div className="success-message">{success}</div>}

      <div className="filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          {TEXT.all} ({counts.all})
        </button>
        <button className={filter === 'cekajici' ? 'active' : ''} onClick={() => setFilter('cekajici')}>
          {TEXT.waiting} ({counts.cekajici})
        </button>
        <button className={filter === 'prijata' ? 'active' : ''} onClick={() => setFilter('prijata')}>
          {TEXT.accepted} ({counts.prijata})
        </button>
        <button className={filter === 'odmitnuta' ? 'active' : ''} onClick={() => setFilter('odmitnuta')}>
          {TEXT.rejected} ({counts.odmitnuta})
        </button>
        <button className={filter === 'zrusena' ? 'active' : ''} onClick={() => setFilter('zrusena')}>
          {TEXT.canceled} ({counts.zrusena})
        </button>
      </div>

      <div className="reservations-list">
        {filteredRezervace.length === 0 ? (
          <div className="no-reservations">
            {filter === 'all'
              ? TEXT.emptyAll
              : `Nemáte žádné rezervace se stavem „${getStatusText(filter)}“.`}
          </div>
        ) : (
          filteredRezervace.map((reservation) => {
            const isExpanded = !!expanded[reservation.id];
            const canCancelReservation = canCancelReservationByRule(reservation);
            const mainPassengerId = reservation.uzivatel?.id;
            const mainPassengerName = getPassengerDisplayName(reservation.uzivatel);
            const autoText = reservation.jizda?.auto
              ? reservation.jizda.auto.smazane
                ? 'Smazané auto'
                : `${reservation.jizda.auto.znacka}${reservation.jizda.auto.model ? ` ${reservation.jizda.auto.model}` : ''}${reservation.jizda.auto.spz ? ` (${reservation.jizda.auto.spz})` : ''}`
              : TEXT.notProvided;
            const mezistaniceText =
              reservation.jizda?.mezistanice && reservation.jizda.mezistanice.length > 0
                ? reservation.jizda.mezistanice
                    .slice()
                    .sort((a, b) => a.poradi - b.poradi)
                    .map((item) => item.misto)
                    .join(' -> ')
                : TEXT.noWaypoints;

            return (
              <div
                key={reservation.id}
                className={`reservation-card ${
                  (focusReservationId && reservation.id === focusReservationId) ||
                  (focusRideId && reservation.jizda_id === focusRideId)
                    ? 'focused'
                    : ''
                }`}
              >
                <button
                  type="button"
                  className="reservation-header reservation-header-btn"
                  onClick={() => toggleExpanded(reservation.id)}
                >
                  <div className="reservation-header-main">
                    <div className="route-info">
                      <h3>
                        {reservation.jizda?.odkud || TEXT.unknownPlace} › {reservation.jizda?.kam || TEXT.unknownPlace}
                      </h3>
                      <div className="reservation-header-meta">{formatCompactDate(reservation.jizda?.cas_odjezdu)}</div>
                    </div>
                    <span className="price">{reservation.jizda?.cena ?? 0} Kč</span>
                  </div>

                  <div className="header-right">
                    <div className="status-badge" style={{ backgroundColor: getStatusColor(reservation.status) }}>
                      {getStatusText(reservation.status)}
                    </div>
                    <span className={`chevron ${isExpanded ? 'open' : ''}`}>v</span>
                  </div>
                </button>

                {isExpanded && (
                  <>
                    <div className="reservation-details">
                      <div className="reservation-details-grid">
                        <div className="reservation-details-column">
                          <div className="reservation-detail-block">
                            <strong>{TEXT.departure}</strong>
                            <span>{formatDate(reservation.jizda?.cas_odjezdu)}</span>
                          </div>
                          <div className="reservation-detail-block">
                            <strong>{TEXT.freeSeats}</strong>
                            <span>{reservation.jizda?.volna_mista ?? DASH} / {reservation.jizda?.pocet_mist ?? DASH}</span>
                          </div>
                          <div className="reservation-detail-block">
                            <strong>{TEXT.queuedCount}</strong>
                            <span>{reservation.jizda?.pocet_cekajicich_rezervaci ?? 0}</span>
                          </div>
                          <div className="reservation-detail-block">
                            <strong>{TEXT.waypoints}</strong>
                            <span>{mezistaniceText}</span>
                          </div>
                        </div>

                        <div className="reservation-details-column">
                          <div className="reservation-detail-block">
                            <strong>{TEXT.arrival}</strong>
                            <span>{formatDate(reservation.jizda?.cas_prijezdu)}</span>
                          </div>
                          <div className="reservation-detail-block">
                            <strong>{TEXT.driver}</strong>
                            {reservation.jizda?.ridic?.id ? (
                              <button
                                type="button"
                                className="driver-link"
                                onClick={() => navigate(`/profil/${reservation.jizda.ridic.id}`)}
                                title="Otevřít profil řidiče"
                              >
                                {reservation.jizda.ridic.jmeno || TEXT.driver}
                              </button>
                            ) : (
                              <span>{TEXT.unknown}</span>
                            )}
                          </div>
                          <div className="reservation-detail-block">
                            <strong>{TEXT.car}</strong>
                            <span>{autoText}</span>
                          </div>
                          <div className="reservation-detail-block reservation-detail-block--passengers">
                            <strong>{TEXT.passengers}</strong>
                            {reservation.jizda ? renderPassengers(reservation.jizda) : <span>{TEXT.noPassengers}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="passengers-section">
                        <strong>{TEXT.reservationFor}</strong>
                        <ReservationPassengerSummary
                          reservation={reservation}
                          primaryPassengerName={mainPassengerName}
                          primaryPassengerId={mainPassengerId}
                          onOpenProfile={() => {
                            if (mainPassengerId) navigate(`/profil/${mainPassengerId}`);
                          }}
                        />
                      </div>

                      <div className="ride-status-info">
                        <strong>{TEXT.rideStatus}</strong>{' '}
                        <span className={`ride-status-badge ${reservation.jizda?.status || ''}`}>
                          {getRideStatusText(reservation.jizda?.status)}
                        </span>
                      </div>

                      <div className="note-info">
                        <strong>{TEXT.seatCount}</strong> {reservation.pocet_mist ?? 1}
                      </div>

                      {reservation.status === 'cekajici' && Number.isInteger(reservation.poradi_cekajici) && (
                        <div className="queue-info">
                          <strong>{TEXT.queuePosition}</strong> {reservation.poradi_cekajici}
                        </div>
                      )}

                      {reservation.poznamka && (
                        <div className="note-info">
                          <strong>{TEXT.note}</strong> {reservation.poznamka}
                        </div>
                      )}
                    </div>

                    <div className="reservation-actions">
                      {reservation.status === 'cekajici' && canCancelReservation && (
                        <button className="btn-cancel" onClick={() => handleCancelReservation(reservation.id)}>
                          {TEXT.cancelReservation}
                        </button>
                      )}

                      {reservation.status === 'prijata' && (
                        <div className="accepted-info">
                          <span className="success-text">{TEXT.confirmed}</span>
                          {canCancelReservation && (
                            <button className="btn-cancel" onClick={() => handleCancelReservation(reservation.id)}>
                              {TEXT.cancelReservation}
                            </button>
                          )}
                        </div>
                      )}

                      {reservation.status === 'odmitnuta' && (
                        <div className="rejected-info">
                          <span className="error-text">{TEXT.wasRejected}</span>
                        </div>
                      )}

                      {reservation.status === 'zrusena' && (
                        <div className="cancelled-info">
                          <span className="muted-text">{TEXT.wasCanceled}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={cancelModal.open}
        title={TEXT.confirmCancelTitle}
        message={TEXT.confirmCancelMessage}
        confirmText={TEXT.confirmCancelTitle}
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

export default MyReservationsPage;
