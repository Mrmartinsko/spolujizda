import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import RideList from '../components/rides/RideList';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './MyRidesPage.css';

const MyRidesPage = () => {
  const { token, user } = useAuth();
  const [mojeJizdy, setMojeJizdy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');

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
        headers: { Authorization: `Bearer ${token}` },
      });
      setMojeJizdy(response.data || []);
    } catch (err) {
      console.log('Chyba při načítání jízd:', err.response?.data || err.message);
      setError('Jízdy se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  };

  const ridicJizdy = useMemo(
    () => mojeJizdy.filter((j) => j.ridic_id === user?.id),
    [mojeJizdy, user?.id]
  );

  const filteredJizdy = ridicJizdy.filter((jizda) => {
    if (filter === 'all') return true;
    if (filter === 'active') return jizda.status === 'aktivni';
    if (filter === 'completed') return jizda.status === 'dokoncena';
    if (filter === 'cancelled') return jizda.status === 'zrusena';
    return true;
  });

  const stats = {
    all: ridicJizdy.length,
    active: ridicJizdy.filter((j) => j.status === 'aktivni').length,
    completed: ridicJizdy.filter((j) => j.status === 'dokoncena').length,
    cancelled: ridicJizdy.filter((j) => j.status === 'zrusena').length,
    transportedPassengers: ridicJizdy
      .filter((j) => j.status === 'dokoncena')
      .reduce((sum, jizda) => sum + (jizda.pasazeri?.length || 0), 0),
  };

  if (loading) {
    return <div className="loading">Načítám vaše jízdy…</div>;
  }

  return (
    <div className="page-shell my-rides-page">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">Moje jízdy</span>
        <h1 className="page-hero__title">Přehled všech tras, které nabízíte jako řidič</h1>
        <p className="page-hero__text">
          Aktivní jízdy vidíte hned nahoře. Dokončené a zrušené zůstávají po ruce, ale neruší hlavní workflow.
        </p>
      </section>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="pill-filter-group">
        <button className={`pill-filter ${filter === 'active' ? 'is-active' : ''}`} onClick={() => setFilter('active')}>
          Aktivní <Badge variant="neutral">{stats.active}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
          Všechny <Badge variant="neutral">{stats.all}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'completed' ? 'is-active' : ''}`} onClick={() => setFilter('completed')}>
          Dokončené <Badge variant="neutral">{stats.completed}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'cancelled' ? 'is-active' : ''}`} onClick={() => setFilter('cancelled')}>
          Zrušené <Badge variant="neutral">{stats.cancelled}</Badge>
        </button>
      </div>

      {filteredJizdy.length === 0 ? (
        <Card className="empty-state">
          <h3 className="empty-state__title">V tomto filtru zatím nic není</h3>
          <p className="empty-state__text">
            Pokud chcete přidat novou trasu, můžete ji nabídnout během chvíle.
          </p>
          <div className="my-rides-page__cta">
            <Button as={Link} to="/nabidnout-jizdu">
              Nabídnout jízdu
            </Button>
          </div>
        </Card>
      ) : (
        <RideList rides={filteredJizdy} onRideUpdate={fetchMojeJizdy} />
      )}

      <section className="page-section">
        <div className="section-heading">
          <h2>Rychlé statistiky</h2>
        </div>
        <div className="stats-grid">
          <Card className="my-rides-stat">
            <strong>{stats.all}</strong>
            <span>Celkem jízd</span>
          </Card>
          <Card className="my-rides-stat">
            <strong>{stats.active}</strong>
            <span>Aktivní nabídky</span>
          </Card>
          <Card className="my-rides-stat">
            <strong>{stats.transportedPassengers}</strong>
            <span>Převezení pasažéři</span>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default MyRidesPage;
