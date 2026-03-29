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

const TEXT = {
  loadError: 'J\u00edzdy se nepoda\u0159ilo na\u010d\u00edst.',
  loadLog: 'Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed j\u00edzd:',
  loading: 'Na\u010d\u00edt\u00e1m va\u0161e j\u00edzdy\u2026',
  eyebrow: 'Moje j\u00edzdy',
  title: 'P\u0159ehled v\u0161ech tras, kter\u00e9 nab\u00edz\u00edte jako \u0159idi\u010d',
  active: 'Aktivn\u00ed',
  all: 'V\u0161echny',
  completed: 'Dokon\u010den\u00e9',
  canceled: 'Zru\u0161en\u00e9',
  emptyTitle: 'V tomto filtru zat\u00edm nic nen\u00ed',
  emptyText: 'Pokud chcete p\u0159idat novou trasu, m\u016f\u017eete ji nab\u00eddnout b\u011bhem chv\u00edle.',
  createRide: 'Nab\u00eddnout j\u00edzdu',
  quickStats: 'Rychl\u00e9 statistiky',
  totalRides: 'Celkem j\u00edzd',
  activeOffers: 'Aktivn\u00ed nab\u00eddky',
  transportedPassengers: 'P\u0159evezen\u00ed pasa\u017e\u00e9\u0159i',
};

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
      console.log(TEXT.loadLog, err.response?.data || err.message);
      setError(TEXT.loadError);
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
    return <div className="loading">{TEXT.loading}</div>;
  }

  return (
    <div className="page-shell my-rides-page">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">{TEXT.eyebrow}</span>
        <h1 className="page-hero__title">{TEXT.title}</h1>
      </section>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="pill-filter-group">
        <button className={`pill-filter ${filter === 'active' ? 'is-active' : ''}`} onClick={() => setFilter('active')}>
          {TEXT.active} <Badge variant="neutral">{stats.active}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
          {TEXT.all} <Badge variant="neutral">{stats.all}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'completed' ? 'is-active' : ''}`} onClick={() => setFilter('completed')}>
          {TEXT.completed} <Badge variant="neutral">{stats.completed}</Badge>
        </button>
        <button className={`pill-filter ${filter === 'cancelled' ? 'is-active' : ''}`} onClick={() => setFilter('cancelled')}>
          {TEXT.canceled} <Badge variant="neutral">{stats.cancelled}</Badge>
        </button>
      </div>

      {filteredJizdy.length === 0 ? (
        <Card className="empty-state">
          <h3 className="empty-state__title">{TEXT.emptyTitle}</h3>
          <p className="empty-state__text">{TEXT.emptyText}</p>
          <div className="my-rides-page__cta">
            <Button as={Link} to="/nabidnout-jizdu">
              {TEXT.createRide}
            </Button>
          </div>
        </Card>
      ) : (
        <RideList rides={filteredJizdy} onRideUpdate={fetchMojeJizdy} compactMode="management" />
      )}

      <section className="page-section">
        <div className="section-heading">
          <h2>{TEXT.quickStats}</h2>
        </div>
        <div className="stats-grid">
          <Card className="my-rides-stat">
            <strong>{stats.all}</strong>
            <span>{TEXT.totalRides}</span>
          </Card>
          <Card className="my-rides-stat">
            <strong>{stats.active}</strong>
            <span>{TEXT.activeOffers}</span>
          </Card>
          <Card className="my-rides-stat">
            <strong>{stats.transportedPassengers}</strong>
            <span>{TEXT.transportedPassengers}</span>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default MyRidesPage;
