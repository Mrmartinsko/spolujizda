import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import RideList from '../components/rides/RideList';
import './MyRidesPage.css';

const MyRidesPage = () => {
  const { token, user } = useAuth();
  const [mojeJizdy, setMojeJizdy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ default: active (ať hned vidíš aktuální jízdy)
  const [filter, setFilter] = useState('active'); // all, active, completed, cancelled

  const filterLabel = {
    all: 'všechny',
    active: 'aktivní',
    completed: 'dokončené',
    cancelled: 'zrušené',
  };

  useEffect(() => {
    if (token) {
      fetchMojeJizdy();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchMojeJizdy = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/jizdy/moje', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMojeJizdy(response.data || []);
    } catch (err) {
      console.log("Chyba při fetchMojeJizdy:", err.response?.data || err.message);
      setError('Chyba při načítání jízd');
    } finally {
      setLoading(false);
    }
  };

  const handleRideUpdate = () => {
    fetchMojeJizdy();
  };

  // ✅ jen jízdy, kde jsem řidič
  const ridicJizdy = mojeJizdy.filter(j => j.ridic_id === user?.id);

  const filteredJizdy = ridicJizdy.filter(jizda => {
    if (filter === 'all') return true;
    if (filter === 'active') return jizda.status === 'aktivni';
    if (filter === 'completed') return jizda.status === 'dokoncena';
    if (filter === 'cancelled') return jizda.status === 'zrusena';
    return true;
  });

  const countAll = ridicJizdy.length;
  const countActive = ridicJizdy.filter(j => j.status === 'aktivni').length;
  const countCompleted = ridicJizdy.filter(j => j.status === 'dokoncena').length;
  const countCancelled = ridicJizdy.filter(j => j.status === 'zrusena').length;

  const transportedPassengers = ridicJizdy
    .filter(j => j.status === 'dokoncena')
    .reduce((sum, jizda) => sum + (jizda.pasazeri?.length || 0), 0);

  if (loading) {
    return (
      <div className="my-rides-page">
        <div className="loading">Načítám vaše jízdy...</div>
      </div>
    );
  }

  return (
    <div className="my-rides-page">
      <div className="page-header">
        <h1>Moje jízdy (řidič)</h1>
        <p>Přehled všech vašich nabídnutých jízd</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-controls">
        {/* ✅ pořadí: Aktivní → Všechny → Dokončené → Zrušené */}
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Aktivní ({countActive})
        </button>

        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Všechny ({countAll})
        </button>

        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Dokončené ({countCompleted})
        </button>

        <button
          className={filter === 'cancelled' ? 'active' : ''}
          onClick={() => setFilter('cancelled')}
        >
          Zrušené ({countCancelled})
        </button>
      </div>

      {filteredJizdy.length === 0 ? (
        <div className="no-rides">
          <h3>Žádné jízdy</h3>
          <p>
            {filter === 'all'
              ? 'Zatím jste nenabídli žádnou jízdu.'
              : `Žádné ${filterLabel[filter]} jízdy.`
            }
          </p>
          <a href="/nabidnout-jizdu" className="create-ride-btn">
            Nabídnout první jízdu
          </a>
        </div>
      ) : (
        <div className="rides-container">
          <RideList
            rides={filteredJizdy}
            onRideUpdate={handleRideUpdate}
          />
        </div>
      )}

      <div className="stats-section">
        <h2>Statistiky</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{countAll}</div>
            <div className="stat-label">Celkem jízd</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{countActive}</div>
            <div className="stat-label">Aktivních jízd</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{transportedPassengers}</div>
            <div className="stat-label">Převezených pasažérů</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{countCompleted}</div>
            <div className="stat-label">Dokončených cest</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRidesPage;
