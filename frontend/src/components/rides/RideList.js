import React, { useEffect, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import ReservationPassengerSummary from '../reservations/ReservationPassengerSummary';
import './RideList.css';

const API = 'http://localhost:5000/api';
const emptyReservationModal = { open: false, rideId: null, pocet_mist: 1, max_mist: 1, dalsi_pasazeri: [], poznamka: '' };

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
    if (!rides?.length) return;
    const initialExpanded = {};
    // Aktivni nebo primo fokusovana jizda se rozbali sama, aby se uzivatel hned dostal k detailu.
    rides.forEach((ride) => {
      if (ride.status === 'aktivni' || (focusRideId && ride.id === focusRideId)) initialExpanded[ride.id] = true;
    });
    setExpanded(initialExpanded);
  }, [focusRideId, rides]);

  useEffect(() => {
    if (!focusRideId || !shouldOpenReservations || !rides?.length) return;
    const targetRide = rides.find((ride) => ride.id === focusRideId);
    if (!targetRide) return;
    // Odkazy z notifikaci umi otevrit rovnou spravu rezervaci konkretni jizdy.
    setExpanded((prev) => ({ ...prev, [focusRideId]: true }));
    if (targetRide.ridic_id === user?.id) {
      setShowReservations((prev) => ({ ...prev, [focusRideId]: true }));
      if (!rezervace[focusRideId]) fetchReservations(focusRideId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRideId, rezervace, rides, shouldOpenReservations, user]);

  useEffect(() => {
    if (!user || !rides?.length) return;
    // Rezervace ridice dotahujeme az po rozbaleni karty, aby seznam jizd nezdrzovalo zbytecne nacitani.
    rides.forEach((ride) => {
      if (ride.ridic_id === user.id && expanded[ride.id] && rezervace[ride.id] === undefined) fetchReservations(ride.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, rezervace, rides, user]);

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? '--' : d.toLocaleString('cs-CZ');
  };
  const formatCompactDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const hasNotDepartedYet = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const d = new Date(ride.cas_odjezdu);
    return !Number.isNaN(d.getTime()) && d > new Date();
  };
  const canCancelRideByRule = (ride) => !!ride && ride.status === 'aktivni' && hasNotDepartedYet(ride);
  const canKickByTime = (ride) => {
    if (!ride?.cas_odjezdu) return false;
    const departure = new Date(ride.cas_odjezdu);
    if (Number.isNaN(departure.getTime())) return false;
    return new Date() <= new Date(departure.getTime() - 60 * 60 * 1000);
  };
  const getRideRouteText = (ride) => [ride.odkud, ...(ride.mezistanice || []).slice().sort((a, b) => (a.poradi ?? 0) - (b.poradi ?? 0)).map((s) => s.misto).filter(Boolean), ride.kam].filter(Boolean).join(' -> ');
  const getRideStatusText = (status) => ({ aktivni: 'Aktivní', zrusena: 'Zrušená', dokoncena: 'Dokončená' }[status] || status || 'Neznámý stav');
  const getPassengerId = (p) => p?.uzivatel_id ?? p?.id ?? null;
  const getPassengerDisplayName = (p) => {
    if (!p) return 'Neznámý uživatel';
    return [p.jmeno, p.prijmeni].filter(Boolean).join(' ').trim() || p.prezdivka || p.username || 'Neznámý uživatel';
  };

  const toggleExpanded = async (ride) => {
    const nextExpanded = !expanded[ride.id];
    setExpanded((prev) => ({ ...prev, [ride.id]: nextExpanded }));
    if (nextExpanded && user && ride.ridic_id === user.id && !rezervace[ride.id]) await fetchReservations(ride.id);
  };

  const submitReservation = async (jizdaId, pocetMist = 1, poznamka = '', dalsiPasazeri = []) => {
    try {
      setError(''); setSuccess('');
      await axios.post(`${API}/rezervace/`, { jizda_id: jizdaId, pocet_mist: pocetMist, dalsi_pasazeri: dalsiPasazeri, poznamka }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Rezervace byla odeslána.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při rezervaci');
    }
  };

  const handleReservation = (ride) => {
    const vychoziPocetMist = Math.max(1, Math.min(defaultReservationMist || 1, ride.volna_mista || 1));
    setReservationModal({ open: true, rideId: ride.id, pocet_mist: vychoziPocetMist, max_mist: Math.max(1, ride.volna_mista || 1), dalsi_pasazeri: Array.from({ length: Math.max(0, vychoziPocetMist - 1) }, () => ''), poznamka: '' });
  };

  const updateReservationModal = (field, value) => {
    setReservationModal((prev) => {
      if (field !== 'pocet_mist') return { ...prev, [field]: value };
      const parsedValue = Number(value);
      const nextCount = Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : value;
      // Pocet doprovodnych jmen se odvozuje z poctu mist, aby formular zustal konzistentni.
      const companionCount = Number.isInteger(parsedValue) && parsedValue > 1 ? parsedValue - 1 : 0;
      const dalsiPasazeri = prev.dalsi_pasazeri.slice(0, companionCount);
      while (dalsiPasazeri.length < companionCount) dalsiPasazeri.push('');
      return { ...prev, pocet_mist: nextCount, dalsi_pasazeri: dalsiPasazeri };
    });
  };
  const updateAdditionalPassenger = (index, value) => setReservationModal((prev) => {
    const dalsiPasazeri = [...prev.dalsi_pasazeri];
    dalsiPasazeri[index] = value;
    return { ...prev, dalsi_pasazeri: dalsiPasazeri };
  });
  const closeReservationModal = () => setReservationModal(emptyReservationModal);

  const fetchReservations = async (jizdaId) => {
    try {
      const response = await axios.get(`${API}/rezervace/jizda/${jizdaId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRezervace((prev) => ({ ...prev, [jizdaId]: response.data.rezervace }));
    } catch (err) {
      console.error('Chyba při načítání rezervací:', err);
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při načítání rezervací');
    }
  };

  const toggleReservations = async (ride) => {
    // Spravu rezervaci ma smysl ukazat jen ridici pred odjezdem, pak uz nelze seznam bezpecne menit.
    const canManageReservations = user && ride.ridic_id === user.id && ride.status === 'aktivni' && hasNotDepartedYet(ride);
    if (!canManageReservations) return;
    const isShowing = showReservations[ride.id];
    setShowReservations((prev) => ({ ...prev, [ride.id]: !isShowing }));
    if (!isShowing && !rezervace[ride.id]) await fetchReservations(ride.id);
  };

  const handleReservationAction = async (rezervaceId, action, jizdaId) => {
    try {
      setError(''); setSuccess('');
      await axios.post(`${API}/rezervace/${rezervaceId}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Rezervace byla ${action === 'prijmout' ? 'přijata' : 'odmítnuta'}`);
      await fetchReservations(jizdaId);
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při akci s rezervací');
    }
  };

  const executeDeleteRide = async (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) return setError('Jízdu lze zrušit jen pokud je aktivní a před odjezdem.');
    try {
      setError(''); setSuccess('');
      await axios.delete(`${API}/jizdy/${jizdaId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Jízda byla zrušena.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při rušení jízdy');
    }
  };

  const handleDeleteRide = (jizdaId) => {
    const ride = (rides || []).find((r) => r.id === jizdaId);
    if (!canCancelRideByRule(ride)) return setError('Jízdu lze zrušit jen pokud je aktivní a před odjezdem.');
    setDeleteRideModal({ open: true, rideId: jizdaId });
  };

  const executeKickPassenger = async (rideId, passengerId) => {
    try {
      setError(''); setSuccess('');
      await axios.delete(`${API}/jizdy/${rideId}/pasazeri/${passengerId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Pasažér byl odebrán z jízdy.');
      if (onRideUpdate) onRideUpdate();
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.error || 'Chyba při odebírání pasažéra');
    }
  };
  const handleKickPassenger = (rideId, passengerId) => setKickPassengerModal({ open: true, rideId, passengerId });

  const renderPassengerActions = (rideId, passengerId, canKickPassengersUi) => {
    if (!passengerId) return null;
    const isOpen = activePassengerMenu?.rideId === rideId && activePassengerMenu?.passengerId === passengerId;
    return (
      <div className="passenger-menu">
        <button type="button" className="passenger-menu__trigger" onClick={(e) => { e.stopPropagation(); setActivePassengerMenu((prev) => prev?.rideId === rideId && prev?.passengerId === passengerId ? null : { rideId, passengerId }); }} title="Akce pro pasažéra">
          <MoreHorizontal size={16} />
        </button>
        {isOpen && (
          <div className="passenger-menu__dropdown" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="passenger-menu__item" onClick={() => { setActivePassengerMenu(null); navigate(`/profil/${passengerId}`); }}>Zobrazit profil</button>
            {canKickPassengersUi && <button type="button" className="passenger-menu__item passenger-menu__item--danger" onClick={() => { setActivePassengerMenu(null); handleKickPassenger(rideId, passengerId); }}>Vyhodit pasažéra</button>}
          </div>
        )}
      </div>
    );
  };

  const renderPassengerBlockContent = (ride, rezervaceJizdy, canKickPassengersUi, isDriver) => {
    const prijateRezervaceJizdy = rezervaceJizdy.filter((r) => r.status === 'prijata');
    // Ridic po nacteni rezervaci vidi potvrzene zadosti, ostatni jen finalni seznam pasazeru.
    const hasPassengers = isDriver && rezervace[ride.id] !== undefined ? prijateRezervaceJizdy.length > 0 : Array.isArray(ride.pasazeri) && ride.pasazeri.length > 0;
    if (!hasPassengers) return <span>Žádní pasažéři</span>;
    return (
      <div className="passengers-list" onClick={(e) => e.stopPropagation()}>
        {isDriver && rezervace[ride.id] !== undefined ? prijateRezervaceJizdy.map((rez) => {
          const passengerId = rez.uzivatel?.id ?? rez.uzivatel_id;
          const name = getPassengerDisplayName(rez.uzivatel);
          const isMe = user && passengerId === user.id;
          const showKick = passengerId && passengerId !== user?.id;
          return (
            <div key={rez.id} className="passenger-item reservation-entry">
              <div className="passenger-row">
                <div className="passenger-main">
                  <ReservationPassengerSummary reservation={rez} primaryPassengerName={`${name}${isMe ? ' (ty)' : ''}`} primaryPassengerId={passengerId} onOpenProfile={(e) => { e?.stopPropagation?.(); if (passengerId) navigate(`/profil/${passengerId}`); }} />
                </div>
                {showKick && renderPassengerActions(ride.id, passengerId, canKickPassengersUi)}
              </div>
            </div>
          );
        }) : ride.pasazeri.map((p, idx) => {
          const passengerId = getPassengerId(p);
          const name = getPassengerDisplayName(p);
          const isMe = user && passengerId === user.id;
          const showKick = isDriver && passengerId && passengerId !== user?.id;
          return (
            <div key={passengerId ?? `${ride.id}-${idx}`} className="passenger-item">
              <div className="passenger-row">
                <button type="button" className={`passenger-pill ${isMe ? 'me' : ''}`} onClick={(e) => { e.stopPropagation(); if (passengerId) navigate(`/profil/${passengerId}`); }} title="Otevřít profil">
                  {name}{isMe ? ' (ty)' : ''}
                </button>
                {showKick && renderPassengerActions(ride.id, passengerId, canKickPassengersUi)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!rides?.length) return <div className="ride-list"><p className="no-rides">Žádné jízdy nenalezeny.</p></div>;

  return (
    <div className="ride-list">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {rides.map((ride) => {
        const isExpanded = !!expanded[ride.id];
        const isActive = ride.status === 'aktivni';
        const notDeparted = hasNotDepartedYet(ride);
        const isDriver = user && ride.ridic_id === user.id;
        const isPassenger = user && Array.isArray(ride.pasazeri) && ride.pasazeri.some((p) => getPassengerId(p) === user.id);
        const canSeePassengers = isDriver || isPassenger;
        const canReserve = user && ride.ridic_id !== user.id && isActive && notDeparted && ride.volna_mista > 0;
        const canEdit = isDriver && isActive && notDeparted;
        const canCancel = isDriver && isActive && notDeparted;
        const canManageReservations = isDriver && isActive && notDeparted;
        const rezervaceJizdy = rezervace[ride.id] || [];
        const prijataMista = rezervaceJizdy.filter((r) => r.status === 'prijata').reduce((sum, r) => sum + (Number(r.pocet_mist) || 1), 0);
        // Pokud uz rezervace mame, prepocitame kapacitu z prijatych zadosti misto starsi hodnoty z listingu.
        const volnaMistaProRezervace = rezervace[ride.id] !== undefined ? Math.max(0, ride.pocet_mist - prijataMista) : Math.max(0, ride.volna_mista ?? 0);
        const canKickPassengersUi = isDriver && isActive && canKickByTime(ride);
        const useManagementCompact = compactMode === 'management';
        const autoText = ride.auto ? (ride.auto.smazane ? 'Smazané auto' : `${ride.auto.znacka}${ride.auto.model ? ` ${ride.auto.model}` : ''}${ride.auto.spz ? ` (${ride.auto.spz})` : ''}`) : 'Neuvedeno';
        const mezistaniceText = ride.mezistanice?.length ? ride.mezistanice.slice().sort((a, b) => a.poradi - b.poradi).map((m) => m.misto).join(' -> ') : 'Žádné mezistanice';

        return (
          <div key={ride.id} className={`ride-card ${isExpanded ? 'expanded' : ''} ${focusRideId === ride.id ? 'focused' : ''} ${useManagementCompact ? 'ride-card--management' : ''}`}>
            <button type="button" className="ride-header ride-header-btn" onClick={() => toggleExpanded(ride)}>
              <div className="ride-header-main">
                <div className="ride-route-row">
                  <h3 className="ride-route">{getRideRouteText(ride)}</h3>
                  <span className={`status ride-status-pill ${ride.status}`}>{getRideStatusText(ride.status)}</span>
                </div>
                <div className="ride-header-meta">
                  <span>{formatCompactDate(ride.cas_odjezdu)}</span>
                  <span>{ride.volna_mista} / {ride.pocet_mist} míst</span>
                  {ride.auto && <span>{autoText}</span>}
                </div>
              </div>
              <div className="ride-header-right">
                <span className="ride-price">{ride.cena} Kč</span>
                <span className={`chevron ${isExpanded ? 'open' : ''}`}>v</span>
              </div>
            </button>
            {isExpanded && (
              <>
                <div className="ride-details">
                  <div className="ride-details-grid">
                    <div className="ride-details-column">
                      <div className="ride-detail-block"><strong>Odjezd</strong><span>{formatDate(ride.cas_odjezdu)}</span></div>
                      <div className="ride-detail-block"><strong>Volná místa</strong><span>{ride.volna_mista} / {ride.pocet_mist}</span></div>
                      <div className="ride-detail-block"><strong>Čekajících</strong><span>{ride.pocet_cekajicich_rezervaci ?? 0}</span></div>
                      <div className="ride-detail-block"><strong>Mezizastávky</strong><span>{mezistaniceText}</span></div>
                    </div>
                    <div className="ride-details-column">
                      <div className="ride-detail-block"><strong>Příjezd</strong><span>{formatDate(ride.cas_prijezdu)}</span></div>
                      <div className="ride-detail-block">
                        <strong>Řidič</strong>
                        <button type="button" className="driver-link" onClick={(e) => { e.stopPropagation(); navigate(`/profil/${ride.ridic_id}`); }} title="Otevřít profil řidiče">{ride.ridic?.jmeno || 'Neznámý'}</button>
                      </div>
                      <div className="ride-detail-block"><strong>Auto</strong><span>{autoText}</span></div>
                      <div className="ride-detail-block ride-detail-block--passengers"><strong>Pasažéři</strong>{canSeePassengers ? renderPassengerBlockContent(ride, rezervaceJizdy, canKickPassengersUi, isDriver) : <span>Žádní pasažéři</span>}</div>
                    </div>
                  </div>
                  <div className="ride-status"><strong>Stav jízdy:</strong> <span className={`status ${ride.status}`}>{getRideStatusText(ride.status)}</span></div>
                </div>
                <div className="ride-actions" onClick={(e) => e.stopPropagation()}>
                  {canReserve && <button className="btn-reserve" onClick={() => handleReservation(ride)}>Rezervovat</button>}
                  {isDriver && <>
                    {canManageReservations && <button className="btn-reservations" onClick={() => toggleReservations(ride)}>{showReservations[ride.id] ? 'Skrýt rezervace' : 'Zobrazit rezervace'}{rezervace[ride.id] && ` (${rezervace[ride.id].length})`}</button>}
                    {canEdit && <button className="btn-edit" onClick={() => navigate(`/jizdy/${ride.id}/upravit`)}>Upravit</button>}
                    {canCancel && <button className="btn-delete" onClick={() => handleDeleteRide(ride.id)}>Zrušit jízdu</button>}
                  </>}
                </div>
                {canManageReservations && showReservations[ride.id] && (
                  <div className="reservations-section" onClick={(e) => e.stopPropagation()}>
                    <h4>Rezervace na tuto jízdu</h4>
                    {rezervaceJizdy.length > 0 ? <div className="reservations-list">{rezervaceJizdy.map((r) => {
                      const canAcceptThisReservation = canManageReservations && volnaMistaProRezervace >= (Number(r.pocet_mist) || 1);
                      const primaryPassengerId = r.uzivatel?.id;
                      return (
                        <div key={r.id} className="reservation-item">
                          <div className="reservation-info">
                            <ReservationPassengerSummary reservation={r} primaryPassengerName={getPassengerDisplayName(r.uzivatel)} primaryPassengerId={primaryPassengerId} onOpenProfile={(e) => { e?.stopPropagation?.(); if (primaryPassengerId) navigate(`/profil/${primaryPassengerId}`); }} />
                            <div className="reservation-status">{r.status}</div>
                            <div className="reservation-note"><strong>Míst:</strong> {r.pocet_mist ?? 1}</div>
                            {r.status === 'cekajici' && Number.isInteger(r.poradi_cekajici) && <div className="reservation-note"><strong>Pořadí:</strong> {r.poradi_cekajici}</div>}
                            {r.poznamka && <div className="reservation-note"><em>"{r.poznamka}"</em></div>}
                          </div>
                          {r.status === 'cekajici' && <div className="reservation-actions">
                            <button className="btn-accept" disabled={!canAcceptThisReservation} onClick={() => handleReservationAction(r.id, 'prijmout', ride.id)} title={!canAcceptThisReservation ? 'Jízda nemá dost volných míst.' : 'Přijmout rezervaci'}>Přijmout</button>
                            <button className="btn-reject" onClick={() => handleReservationAction(r.id, 'odmitnout', ride.id)}>Odmítnout</button>
                          </div>}
                          {r.status === 'cekajici' && !canAcceptThisReservation && <div className="reservation-note"><em>Pro tuto rezervaci už není dost volných míst.</em></div>}
                        </div>
                      );
                    })}</div> : <div className="no-reservations">Na tuto jízdu zatím nepřišla žádná rezervace.</div>}
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
            <h3 className="app-modal-title">Poslat rezervaci</h3>
            <p className="app-modal-message">Vyberte počet míst a případně přidejte poznámku pro řidiče. Rezervace se odešle až po potvrzení.</p>
            <label className="app-modal-label" htmlFor="reservation-count">Počet míst</label>
            <input id="reservation-count" type="number" className="reservation-modal-input" min="1" max={reservationModal.max_mist} value={reservationModal.pocet_mist} onChange={(e) => updateReservationModal('pocet_mist', e.target.value)} />
            {reservationModal.dalsi_pasazeri.map((jmeno, index) => {
              const passengerFieldId = `reservation-passenger-${index + 2}`;
              return (
                <div key={index} className="reservation-modal-passenger-group">
                  <label className="app-modal-label" htmlFor={passengerFieldId}>Jméno pasažéra {index + 2}</label>
                  <input id={passengerFieldId} type="text" className="reservation-modal-input" value={jmeno} maxLength={80} onChange={(e) => updateAdditionalPassenger(index, e.target.value)} />
                </div>
              );
            })}
            <label className="app-modal-label" htmlFor="reservation-note">Poznámka</label>
            <textarea id="reservation-note" className="app-modal-textarea" value={reservationModal.poznamka} onChange={(e) => updateReservationModal('poznamka', e.target.value)} placeholder="Např. nastoupím na druhé zastávce" rows={3} />
            <div className="app-modal-actions">
              <button type="button" className="app-btn app-btn-secondary" onClick={closeReservationModal}>Zrušit</button>
              <button type="button" className="app-btn app-btn-primary" onClick={() => {
                const rideId = reservationModal.rideId;
                const pocetMist = Number(reservationModal.pocet_mist);
                const maxMist = Number(reservationModal.max_mist);
                const dalsiPasazeri = reservationModal.dalsi_pasazeri.map((name) => name.trim());
                if (!rideId) return;
                if (!Number.isInteger(pocetMist) || pocetMist <= 0) return setError('Počet míst musí být alespoň 1.');
                if (pocetMist > maxMist) return setError('Počet míst nesmí být vyšší než aktuální volná kapacita.');
                if (dalsiPasazeri.length !== Math.max(0, pocetMist - 1)) return setError('Počet jmen doprovodu nesouhlasí s počtem míst.');
                if (dalsiPasazeri.some((name) => !name)) return setError('Vyplňte jména všech dalších pasažérů.');
                closeReservationModal();
                submitReservation(rideId, pocetMist, reservationModal.poznamka.trim(), dalsiPasazeri);
              }}>Potvrdit rezervaci</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteRideModal.open} title="Zrušit jízdu" message="Opravdu chcete zrušit tuto jízdu?" confirmText="Zrušit jízdu" danger onCancel={() => setDeleteRideModal({ open: false, rideId: null })} onConfirm={() => { const rideId = deleteRideModal.rideId; setDeleteRideModal({ open: false, rideId: null }); if (rideId) executeDeleteRide(rideId); }} />
      <ConfirmModal isOpen={kickPassengerModal.open} title="Vyhodit pasažéra" message="Opravdu chcete odebrat pasažéra z jízdy?" confirmText="Vyhodit pasažéra" danger onCancel={() => setKickPassengerModal({ open: false, rideId: null, passengerId: null })} onConfirm={() => { const { rideId, passengerId } = kickPassengerModal; setKickPassengerModal({ open: false, rideId: null, passengerId: null }); if (rideId && passengerId) executeKickPassenger(rideId, passengerId); }} />
    </div>
  );
};

export default RideList;
