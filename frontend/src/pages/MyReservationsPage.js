import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './MyReservationsPage.css';
import { useNavigate } from 'react-router-dom';


const MyReservationsPage = () => {
  const { token } = useAuth();
  const [rezervace, setRezervace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, cekajici, prijata, odmitnuta, zrusena
  const navigate = useNavigate();


  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  useEffect(() => {
    if (token) fetchRezervace();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchRezervace = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        'http://localhost:5000/api/rezervace/moje',
        { headers }
      );

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.rezervace || []);

      const moje = raw.filter(r => !r.typ || r.typ === 'odeslana');
      setRezervace(moje);

    } catch (err) {
      setError('Chyba při načítání rezervací');
      console.error(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (rezervaceId) => {
    if (window.confirm('Opravdu chcete zrušit tuto rezervaci?')) {
      try {
        await axios.delete(
          `http://localhost:5000/api/rezervace/${rezervaceId}/zrusit`,
          { headers }
        );

        alert('Rezervace byla zrušena');
        fetchRezervace();
      } catch (err) {
        alert(err.response?.data?.error || 'Chyba při rušení rezervace');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('cs-CZ');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'cekajici': return '#ffa500';
      case 'prijata': return '#28a745';
      case 'odmitnuta': return '#dc3545';
      case 'zrusena': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'cekajici': return 'Čekající';
      case 'prijata': return 'Přijatá';
      case 'odmitnuta': return 'Odmítnutá';
      case 'zrusena': return 'Zrušená';
      default: return status || '—';
    }
  };

  const getRideStatusText = (status) => {
    switch (status) {
      case 'aktivni': return 'Aktivní';
      case 'zrusena': return 'Zrušená';
      case 'dokoncena': return 'Dokončená';
      default: return status || '—';
    }
  };

  const filteredRezervace = rezervace.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const counts = {
    all: rezervace.length,
    cekajici: rezervace.filter(r => r.status === 'cekajici').length,
    prijata: rezervace.filter(r => r.status === 'prijata').length,
    odmitnuta: rezervace.filter(r => r.status === 'odmitnuta').length,
    zrusena: rezervace.filter(r => r.status === 'zrusena').length,
  };

  if (loading) {
    return (
      <div className="my-reservations-page">
        <div className="loading">Načítám rezervace...</div>
      </div>
    );
  }

  return (
    <div className="my-reservations-page">
      <div className="page-header">
        <h1>Moje rezervace (pasažér)</h1>
        <p>Přehled jízd, na které jste si udělali rezervaci</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchRezervace} className="retry-btn">
            Zkusit znovu
          </button>
        </div>
      )}

      <div className="filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          Všechny ({counts.all})
        </button>
        <button className={filter === 'cekajici' ? 'active' : ''} onClick={() => setFilter('cekajici')}>
          Čekající ({counts.cekajici})
        </button>
        <button className={filter === 'prijata' ? 'active' : ''} onClick={() => setFilter('prijata')}>
          Přijaté ({counts.prijata})
        </button>
        <button className={filter === 'odmitnuta' ? 'active' : ''} onClick={() => setFilter('odmitnuta')}>
          Odmítnuté ({counts.odmitnuta})
        </button>
        <button className={filter === 'zrusena' ? 'active' : ''} onClick={() => setFilter('zrusena')}>
          Zrušené ({counts.zrusena})
        </button>
      </div>

      <div className="reservations-list">
        {filteredRezervace.length === 0 ? (
          <div className="no-reservations">
            {filter === 'all'
              ? 'Nemáte žádné rezervace'
              : `Nemáte žádné rezervace se statusem "${getStatusText(filter)}"`}
          </div>
        ) : (
          filteredRezervace.map((r) => (
            <div key={r.id} className="reservation-card">

              <div className="reservation-header">
                <div className="route-info">
                  <h3>
                    {r.jizda?.odkud || 'N/A'} → {r.jizda?.kam || 'N/A'}
                  </h3>
                  <span className="price">{r.jizda?.cena ?? 0} Kč</span>
                </div>

                <div
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(r.status) }}
                >
                  {getStatusText(r.status)}
                </div>
              </div>

              <div className="reservation-details">

                <div className="time-info">
                  <div className="time-item">
                    <strong>Odjezd:</strong> {formatDate(r.jizda?.cas_odjezdu)}
                  </div>
                  <div className="time-item">
                    <strong>Příjezd:</strong> {formatDate(r.jizda?.cas_prijezdu)}
                  </div>
                </div>

                <div className="driver-info">
                  <strong>Řidič:</strong>{' '}
                  {r.jizda?.ridic?.id ? (
                    <button
                      type="button"
                      className="driver-link"
                      onClick={() => navigate(`/profil/${r.jizda.ridic.id}`)}
                      title="Otevřít profil řidiče"
                    >
                      {r.jizda.ridic.jmeno || 'Řidič'}
                    </button>
                  ) : (
                    <span>Neznámý</span>
                  )}
                </div>

                <div className="ride-status-info">
                  <strong>Status jízdy:</strong>{' '}
                  <span className={`ride-status-badge ${r.jizda?.status || ''}`}>
                    {getRideStatusText(r.jizda?.status)}
                  </span>
                </div>

                {r.jizda?.auto && !r.jizda.auto.smazane && (
                  <div className="car-info">
                    <strong>Auto:</strong> {r.jizda.auto.znacka} {r.jizda.auto.model}
                    {r.jizda.auto.spz && ` (${r.jizda.auto.spz})`}
                  </div>
                )}

                {r.jizda?.auto?.smazane && (
                  <div className="car-info">
                    <strong>Auto:</strong> Smazané auto
                  </div>
                )}

                {r.poznamka && (
                  <div className="note-info">
                    <strong>Poznámka:</strong> {r.poznamka}
                  </div>
                )}
              </div>

              <div className="reservation-actions">

                {r.status === 'cekajici' && (
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancelReservation(r.id)}
                  >
                    Zrušit rezervaci
                  </button>
                )}

                {r.status === 'prijata' && (
                  <div className="accepted-info">
                    <span className="success-text">✅ Rezervace přijata!</span>
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancelReservation(r.id)}
                    >
                      Zrušit rezervaci
                    </button>
                  </div>
                )}

                {r.status === 'odmitnuta' && (
                  <div className="rejected-info">
                    <span className="error-text">❌ Rezervace odmítnuta</span>
                  </div>
                )}

                {r.status === 'zrusena' && (
                  <div className="cancelled-info">
                    <span className="muted-text">Rezervace zrušena</span>
                  </div>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyReservationsPage;
