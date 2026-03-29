import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Route, ShieldCheck, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RideSearch from '../components/rides/RideSearch';
import RideList from '../components/rides/RideList';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
  const [latestRides, setLatestRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [error, setError] = useState('');
  const [pendingRatings, setPendingRatings] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();

  const stats = useMemo(
    () => [
      { icon: Route, label: 'Aktuální nabídky', value: latestRides.length },
      { icon: Clock3, label: 'Průběžně hlídané rezervace', value: '24/7' },
      { icon: ShieldCheck, label: 'Ověřená komunita', value: 'škola' },
    ],
    [latestRides.length]
  );

  const fetchLatestRides = async () => {
    try {
      setLoadingRides(true);
      const response = await axios.get('http://localhost:5000/api/jizdy/');
      const now = new Date();
      const currentRides = response.data.jizdy
        .filter((ride) => new Date(ride.cas_odjezdu) > now)
        .sort((a, b) => new Date(a.cas_odjezdu) - new Date(b.cas_odjezdu))
        .slice(0, 8);
      setLatestRides(currentRides);
      setError('');
    } catch (err) {
      setError('Nepodařilo se načíst aktuální jízdy.');
      console.error(err);
    } finally {
      setLoadingRides(false);
    }
  };

  useEffect(() => {
    fetchLatestRides();
  }, []);

  useEffect(() => {
    const fetchPending = async () => {
      if (!token) {
        setPendingRatings([]);
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/hodnoceni/pending', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingRatings(res.data.pending || []);
      } catch (e) {
        console.error('Chyba při načítání nevyřízených hodnocení:', e);
      }
    };

    fetchPending();
  }, [token]);

  const goToPendingRating = () => {
    if (!pendingRatings.length) return;
    const pending = pendingRatings[0];
    navigate(`/ohodnotit/${pending.jizda_id}/${pending.cilovy_uzivatel_id}`);
  };

  return (
    <div className="page-shell home-page">
      <section className="page-hero home-hero">
        <div className="home-hero__content">
          <span className="page-hero__eyebrow">Studentská spolujízda</span>
          <h1 className="page-hero__title">Cesty mezi školou, kolejí a domovem bez zbytečného chaosu</h1>
          <p className="page-hero__text">
            Vyhledejte volné místo, nabídněte vlastní trasu a mějte rezervace, chaty i hodnocení přehledně na jednom místě.
          </p>
        </div>

        <div className="home-hero__stats">
          {stats.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="home-stat">
              <div className="home-stat__icon">
                <Icon size={18} />
              </div>
              <strong>{value}</strong>
              <span>{label}</span>
            </Card>
          ))}
        </div>
      </section>

      {pendingRatings.length > 0 && (
        <Alert variant="warning" className="pending-banner">
          <div className="pending-banner__body">
            <div>
              <strong>Čeká na vás hodnocení řidiče.</strong>
              <div>
                Jízda <strong>{pendingRatings[0].jizda?.odkud} → {pendingRatings[0].jizda?.kam}</strong> je dokončená a stačí už jen krátké hodnocení.
              </div>
            </div>
            <Button onClick={goToPendingRating}>
              <Star size={16} />
              Ohodnotit řidiče
            </Button>
          </div>
        </Alert>
      )}

      <section className="page-section">
        <RideSearch />
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <h2>Nejbližší jízdy</h2>
            <p className="home-section-text">Dominantní je trasa, čas a cena. Ostatní detaily necháváme až v rozbaleném přehledu.</p>
          </div>
          <Badge variant="primary">{latestRides.length} aktuálních nabídek</Badge>
        </div>

        {loadingRides ? (
          <Card className="home-message-card">Načítám dostupné jízdy…</Card>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : latestRides.length === 0 ? (
          <Card className="home-message-card">Zatím tu nejsou žádné nové jízdy. Zkuste to později nebo nabídněte vlastní trasu.</Card>
        ) : (
          <RideList rides={latestRides} onRideUpdate={fetchLatestRides} />
        )}
      </section>
    </div>
  );
};

export default HomePage;
