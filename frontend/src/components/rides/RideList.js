import React, { useEffect, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import ReservationPassengerSummary from '../reservations/ReservationPassengerSummary';
import './RideList.css';

const API = 'http://localhost:5000/api';

const emptyReservationModal = {
  open: false,
  rideId: null,
  pocet_mist: 1,
  max_mist: 1,
  dalsi_pasazeri: [],
  poznamka: '',
};

const RideList = ({ rides, onRideUpdate, defaultReservationMist = 1, compactMode = 'default' }) => {
  const { token, user } = useAuth();
  const [showReservations, setShowReservations] = useState({});
  const [rezervace, setRezervace] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservationModal, setReservationModal] = useState(emptyReservationModal);
  const [deleteRideModal, setDeleteRideModal] = useState({ open: false, rideId: null });
  const [kickPassengerModal, setKickPassengerModal] = useState({ open: false, rideId: null, passengerId: null });
  const [activePassengerMenu, setActivePassengerMenu] = useState(null);
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const focusRideId = Number(new URLSearchParams(location.search).get('focusRide')) || null;
  const shouldOpenReservations = new URLSearchParams(location.search).get('openReservations') === '1';

  useEffect(() => {
    if (!rides || rides.length === 0) return;

    const initialExpanded = {};
    rides.forEach((ride) => {
      if (ride.status === 'aktivni' || (focusRideId && ride.id === focusRideId)) {
        initialExpanded[ride.id] = true;
      }
    });
    setExpanded(initialExpanded);
  }, [focusRideId, rides]);

  useEffect(() => {
    if (!focusRideId || !shouldOpenReservations || !rides || rides.length === 0) return;

    const targetRide = rides.find((ride) => ride.id === focusRideId);
    if (!targetRide) return;

    setExpanded((prev) => ({ ...prev, [focusRideId]: true }));

    if (targetRide.ridic_id === user?.id) {
      setShowReservations((prev) => ({ ...prev, [focusRideId]: true }));
      if (!rezervace[focusRideId]) {
        fetchReservations(focusRideId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRideId, rezervace, rides, shouldOpenReservations, user]);

  useEffect(() => {
    if (!user || !rides || rides.length === 0) return;

    rides.forEach((ride) => {
      const isDriver = ride.ridic_id === user.id;
      const isExpanded = !!expanded[ride.id];

      if (isDriver && isExpanded && rezervace[ride.id] === undefined) {
        fetchReservations(ride.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, rezervace, rides, user]);

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('cs-CZ');
  };

  const formatCompactDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getRideStatusText = (status) => {
    switch (status) {
      case 'aktivni':
        return 'Aktivn�';
      case 'zrusena':
        return 'Zru�en�';
      case 'dokoncena':
        return 'Dokon�en�';
      default:
        return status || 'Nezn�m� stav';
    }
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
    if (!p) return 'Nezn�m� u�ivatel';
    const fullName = [p.jmeno, p.prijmeni].filter(Boolean).join(' ').trim();
    return fullName || p.prezdivka || p.username || 'Nezn�m� u�ivatel';
  };

  const submitReservation = async (jizdaId, pocetMist = 1, poznamka = '', dalsiPasazeri = []) => {
    try {
      setError('');
      setSuccess('');

      await axios.post(
        `${API}/rezervace/`,
        { jizda_id: jizdaId, pocet_mist: pocetMist, dalsi_pasazeri: dalsiPasazeri, poznamka },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Rezervace byla odesl�na.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba p�i rezervaci');
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
      const response = await axios.get(`${API}/rezervace/jizda/${jizdaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRezervace((prev) => ({
        ...prev,
        [jizdaId]: response.data.rezervace,
      }));
    } catch (err) {
      console.error('Chyba p�i na��t�n� rezervac�:', err);
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba p�i na��t�n� rezervac�');
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

      setSuccess(`Rezervace byla ${action === 'prijmout' ? 'p�ijata' : 'odm�tnuta'}`);
      await fetchReservations(jizdaId);
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba p�i akci s rezervac�');
    }
  };

  const executeDeleteRide = async (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('J�zdu lze zru�it jen pokud je aktivn� a p�ed odjezdem.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await axios.delete(`${API}/jizdy/${jizdaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('J�zda byla zru�ena.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba p�i ru�en� j�zdy');
    }
  };

  const handleDeleteRide = (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) {
      setSuccess('');
      setError('J�zdu lze zru�it jen pokud je aktivn� a p�ed odjezdem.');
      return;
    }
    setDeleteRideModal({ open: true, rideId: jizdaId });
  };

  const executeKickPassenger = async (rideId, passengerId) => {
    try {
      setError('');
      setSuccess('');
      await axios.delete(`${API}/jizdy/${rideId}/pasazeri/${passengerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Pasa��r byl odebr�n z j�zdy.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba p�i odeb�r�n� pasa��ra');
    }
  };

  const handleKickPassenger = (rideId, passengerId) => {
    setKickPassengerModal({ open: true, rideId, passengerId });
  };

  const renderPassengerActions = (rideId, passengerId, canKickPassengersUi) => {
    if (!passengerId) return null;

    const isOpen =
      activePassengerMenu?.rideId === rideId &&
      activePassengerMenu?.passengerId === passengerId;

    return (
      <div className="passenger-menu">
        <button
          type="button"
          className="passenger-menu__trigger"
          onClick={(e) => {
            e.stopPropagation();
            setActivePassengerMenu((prev) =>
              prev?.rideId === rideId && prev?.passengerId === passengerId
                ? null
                : { rideId, passengerId }
            );
          }}
          title="Akce pro pasa��ra"
        >
          <MoreHorizontal size={16} />
        </button>

        {isOpen && (
          <div className="passenger-menu__dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="passenger-menu__item"
              onClick={() => {
                setActivePassengerMenu(null);
                navigate(`/profil/${passengerId}`);
              }}
            >
              Zobrazit profil
            </button>
            {canKickPassengersUi && (
              <button
                type="button"
                className="passenger-menu__item passenger-menu__item--danger"
                onClick={() => {
                  setActivePassengerMenu(null);
                  handleKickPassenger(rideId, passengerId);
                }}
              >
                Vyhodit pasa��ra
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPassengerBlockContent = (ride, rezervaceJizdy, canKickPassengersUi, isDriver) => {
    const prijateRezervaceJizdy = rezervaceJizdy.filter((r) => r.status === 'prijata');
    const hasPassengers =
      isDriver && rezervace[ride.id] !== undefined
        ? prijateRezervaceJizdy.length > 0
        : Array.isArray(ride.pasazeri) && ride.pasazeri.length > 0;

    if (!hasPassengers) {
      return <span>��dn� pasa���i</span>;
    }

    return (
      <div className="passengers-list" onClick={(e) => e.stopPropagation()}>
        {isDriver && rezervace[ride.id] !== undefined
          ? prijateRezervaceJizdy.map((rez) => {
              const passengerId = rez.uzivatel?.id ?? rez.uzivatel_id;
              const key = rez.id;
              const name = getPassengerDisplayName(rez.uzivatel);
              const isMe = user && passengerId === user.id;
              const showKick = passengerId && passengerId !== user?.id;

              return (
                <div key={key} className="passenger-item reservation-entry">
                  <div className="passenger-row">
                    <div className="passenger-main">
                      <ReservationPassengerSummary
                        reservation={rez}
                        primaryPassengerName={`${name}${isMe ? ' (ty)' : ''}`}
                        primaryPassengerId={passengerId}
                        onOpenProfile={(e) => {
                          e?.stopPropagation?.();
                          if (passengerId) navigate(`/profil/${passengerId}`);
                        }}
                      />
                    </div>
                    {showKick && renderPassengerActions(ride.id, passengerId, canKickPassengersUi)}
                  </div>
                </div>
              );
            })
          : ride.pasazeri.map((p, idx) => {
              const passengerId = getPassengerId(p);
              const key = passengerId ?? `${ride.id}-${idx}`;
              const name = getPassengerDisplayName(p);
              const isMe = user && passengerId === user.id;
              const showKick = isDriver && passengerId && passengerId !== user?.id;

              return (
                <div key={key} className="passenger-item">
                  <div className="passenger-row">
                    <button
                      type="button"
                      className={`passenger-pill ${isMe ? 'me' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (passengerId) navigate(`/profil/${passengerId}`);
                      }}
                      title="Otev��t profil"
                    >
                      {name}
                      {isMe ? ' (ty)' : ''}
                    </button>
                    {showKick && renderPassengerActions(ride.id, passengerId, canKickPassengersUi)}
                  </div>
                </div>
              );
            })}
      </div>
    );
  };

  if (!rides || rides.length === 0) {
    return (
      <div className="ride-list">
        <p className="no-rides">��dn� j�zdy nenalezeny.</p>
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
        const prijataMista = rezervaceJizdy
          .filter((r) => r.status === 'prijata')
          .reduce((sum, r) => sum + (Number(r.pocet_mist) || 1), 0);
        const volnaMistaProRezervace =
          rezervace[ride.id] !== undefined
            ? Math.max(0, ride.pocet_mist - prijataMista)
            : Math.max(0, ride.volna_mista ?? 0);

        const canKickPassengersUi = isDriver && isActive && canKickByTime(ride);
        const useManagementCompact = compactMode === 'management';
        const autoText = ride.auto
          ? ride.auto.smazane
            ? 'Smazan� auto'
            : `${ride.auto.znacka}${ride.auto.model ? ` ${ride.auto.model}` : ''}${ride.auto.spz ? ` (${ride.auto.spz})` : ''}`
          : 'Neuvedeno';
        const mezistaniceText =
          ride.mezistanice && ride.mezistanice.length > 0
            ? ride.mezistanice
                .slice()
                .sort((a, b) => a.poradi - b.poradi)
                .map((m) => m.misto)
                .join(' -> ')
            : '��dn� mezistanice';

        return (
          <div
            key={ride.id}
            className={`ride-card ${isExpanded ? 'expanded' : ''} ${
              focusRideId === ride.id ? 'focused' : ''
            } ${useManagementCompact ? 'ride-card--management' : ''}`}
          >
            <button
              type="button"
              className="ride-header ride-header-btn"
              onClick={() => toggleExpanded(ride)}
            >
              <div className="ride-header-main">
                <div className="ride-route-row">
                  <h3 className="ride-route">{getRideRouteText(ride)}</h3>
                  <span className={`status ride-status-pill ${ride.status}`}>{getRideStatusText(ride.status)}</span>
                </div>
                <div className="ride-header-meta">
                  <span>{formatCompactDate(ride.cas_odjezdu)}</span>
                  <span>{ride.volna_mista} / {ride.pocet_mist} m�st</span>
                  {ride.auto && <span>{autoText}</span>}
                </div>
              </div>
              <div className="ride-header-right">
                <span className="ride-price">{ride.cena} K�</span>
                <span className={`chevron ${isExpanded ? 'open' : ''}`}>v</span>
              </div>
            </button>

            {isExpanded && (
              <>
                <div className="ride-details">
                  <div className="ride-details-grid">
                    <div className="ride-details-column">
                      <div className="ride-detail-block">
                        <strong>Odjezd</strong>
                        <span>{formatDate(ride.cas_odjezdu)}</span>
                      </div>
                      <div className="ride-detail-block">
                        <strong>Voln� m�sta</strong>
                        <span>{ride.volna_mista} / {ride.pocet_mist}</span>
                      </div>
                      <div className="ride-detail-block">
                        <strong>�ekaj�c�ch</strong>
                        <span>{ride.pocet_cekajicich_rezervaci ?? 0}</span>
                      </div>
                      <div className="ride-detail-block">
                        <strong>Mezizast�vky</strong>
                        <span>{mezistaniceText}</span>
                      </div>
                    </div>

                    <div className="ride-details-column">
                      <div className="ride-detail-block">
                        <strong>P��jezd</strong>
                        <span>{formatDate(ride.cas_prijezdu)}</span>
                      </div>
                      <div className="ride-detail-block">
                        <strong>�idi�</strong>
                        <button
                          type="button"
                          className="driver-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profil/${ride.ridic_id}`);
                          }}
                          title="Otev��t profil �idi�e"
                        >
                          {ride.ridic?.jmeno || 'Nezn�m�'}
                        </button>
                      </div>
                      <div className="ride-detail-block">
                        <strong>Auto</strong>
                        <span>{autoText}</span>
                      </div>
                      <div className="ride-detail-block ride-detail-block--passengers">
                        <strong>Pasa���i</strong>
                        {canSeePassengers
                          ? renderPassengerBlockContent(ride, rezervaceJizdy, canKickPassengersUi, isDriver)
                          : <span>��dn� pasa���i</span>}
                      </div>
                    </div>
                  </div>

                  <div className="ride-status">
                    <strong>Stav j�zdy:</strong>{' '}
                    <span className={`status ${ride.status}`}>{getRideStatusText(ride.status)}</span>
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
                          {showReservations[ride.id] ? 'Skr�t rezervace' : 'Zobrazit rezervace'}
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
                          Zru�it j�zdu
                        </button>
                      )}
                    </>
                  )}
                </div>

                {canManageReservations && showReservations[ride.id] && (
                  <div className="reservations-section" onClick={(e) => e.stopPropagation()}>
                    <h4>Rezervace na tuto j�zdu</h4>

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
                                  <strong>M�st:</strong> {r.pocet_mist ?? 1}
                                </div>
                                {r.status === 'cekajici' && Number.isInteger(r.poradi_cekajici) && (
                                  <div className="reservation-note">
                                    <strong>Po�ad�:</strong> {r.poradi_cekajici}
                                  </div>
                                )}
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
                                    title={!canAcceptThisReservation ? 'J�zda nem� dost voln�ch m�st.' : 'P�ijmout rezervaci'}
                                  >
                                    P�ijmout
                                  </button>
                                  <button
                                    className="btn-reject"
                                    onClick={() => handleReservationAction(r.id, 'odmitnout', ride.id)}
                                  >
                                    Odm�tnout
                                  </button>
                                </div>
                              )}

                              {r.status === 'cekajici' && !canAcceptThisReservation && (
                                <div className="reservation-note">
                                  <em>Pro tuto rezervaci u� nen� dost voln�ch m�st.</em>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-reservations">Na tuto j�zdu zat�m nep�i�la ��dn� rezervace.</div>
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
              Vyberte po�et m�st a p��padn� p�idejte pozn�mku pro �idi�e. Rezervace se ode�le a� po potvrzen�.
            </p>

            <label className="app-modal-label">Po�et m�st</label>
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
                <label className="app-modal-label">Jm�no pasa��ra {index + 2}</label>
                <input
                  type="text"
                  className="reservation-modal-input"
                  value={jmeno}
                  maxLength={80}
                  onChange={(e) => updateAdditionalPassenger(index, e.target.value)}
                />
              </div>
            ))}

            <label className="app-modal-label">Pozn�mka</label>
            <textarea
              className="app-modal-textarea"
              value={reservationModal.poznamka}
              onChange={(e) => updateReservationModal('poznamka', e.target.value)}
              placeholder="Nap�. nastoup�m na druh� zast�vce"
              rows={3}
            />

            <div className="app-modal-actions">
              <button type="button" className="app-btn app-btn-secondary" onClick={closeReservationModal}>
                Zru�it
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
                    setError('Po�et m�st mus� b�t alespo� 1.');
                    return;
                  }
                  if (pocetMist > maxMist) {
                    setError('Po�et m�st nesm� b�t vy��� ne� aktu�ln� voln� kapacita.');
                    return;
                  }
                  if (dalsiPasazeri.length !== Math.max(0, pocetMist - 1)) {
                    setError('Po�et jmen doprovodu nesouhlas� s po�tem m�st.');
                    return;
                  }
                  if (dalsiPasazeri.some((name) => !name)) {
                    setError('Vypl�te jm�na v�ech dal��ch pasa��r�.');
                    return;
                  }

                  closeReservationModal();
                  submitReservation(rideId, pocetMist, reservationModal.poznamka.trim(), dalsiPasazeri);
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
        title="Zru�it j�zdu"
        message="Opravdu chcete zru�it tuto j�zdu?"
        confirmText="Zru�it j�zdu"
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
        title="Vyhodit pasa��ra"
        message="Opravdu chcete odebrat pasa��ra z j�zdy?"
        confirmText="Vyhodit pasa��ra"
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
