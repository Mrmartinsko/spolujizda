import { useEffect, useState } from 'react';
import hodnoceniService from './hodnoceniService';

export default function UserRatings({ uzivatelId, role = null }) {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await hodnoceniService.getUzivatelova(uzivatelId, role);
        setRatings(res.data.hodnoceni);
        setStats(res.data.statistiky);
      } catch (err) {
        setError('Nepodařilo se načíst hodnocení.');
      }
    };
    load();
  }, [uzivatelId, role]);

  if (error) return <p>{error}</p>;
  if (!ratings) return <p>Načítání...</p>;

  return (
    <div>
      <h3>Hodnocení</h3>
      {stats && (
        <div>
          <p>Průměrná známka: {stats.prumer} / 5</p>
          <p>Celkem: {stats.celkem}</p>
        </div>
      )}

      {ratings.map((r) => (
        <div key={r.id} className="rating-card">
          <strong>Známka: {r.znamka}</strong>
          <p>{r.komentar}</p>
          <small>{new Date(r.datum).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
