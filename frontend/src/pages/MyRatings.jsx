import { useEffect, useState } from 'react';
import hodnoceniService from '../components/hodnoceni/hodnoceniService';

export default function MyRatings() {
  const [dana, setDana] = useState([]);
  const [dostana, setDostana] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await hodnoceniService.getMoje();
      setDana(res.data.dana_hodnoceni);
      setDostana(res.data.dostana_hodnoceni);
    };
    load();
  }, []);

  return (
    <div>
      <h3>Dostal jsem</h3>
      {dostana.map((h) => (
        <p key={h.id}>{h.znamka} - {h.komentar}</p>
      ))}

      <h3>Udělal jsem</h3>
      {dana.map((h) => (
        <p key={h.id}>{h.znamka} - {h.komentar}</p>
      ))}
    </div>
  );
}

