import { useState } from 'react';
import hodnoceniService from './hodnoceniService';

export default function AddRatingForm({ cilovyUzivatelId, role, onSuccess }) {
  const [znamka, setZnamka] = useState(5);
  const [komentar, setKomentar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await hodnoceniService.create({
        cilovy_uzivatel_id: cilovyUzivatelId,
        role,
        znamka: Number(znamka),
        komentar,
      });
      setSuccess('Hodnocení bylo úspěšně přidáno.');
      setKomentar('');
      setZnamka(5);
      onSuccess?.(); // reload ratings if needed
    } catch (err) {
      setError(err.response?.data?.error || 'Chyba při odesílání hodnocení.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      <label>Známka (1–5)</label>
      <input
        type="number"
        min="1"
        max="5"
        value={znamka}
        onChange={(e) => setZnamka(e.target.value)}
        required
      />

      <label>Komentář (nepovinný)</label>
      <textarea
        value={komentar}
        onChange={(e) => setKomentar(e.target.value)}
      />

      <button type="submit">Odeslat hodnocení</button>
    </form>
  );
}
