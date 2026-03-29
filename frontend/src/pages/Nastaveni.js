import React, { useState } from 'react';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Nastaveni = () => {
  const [passwordData, setPasswordData] = useState({
    stare_heslo: '',
    nove_heslo: '',
    potvrzeni_hesla: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [language] = useState('cs');

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (message || error) {
      setMessage('');
      setError('');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordData.stare_heslo || !passwordData.nove_heslo || !passwordData.potvrzeni_hesla) {
      setError('Vyplňte všechna pole.');
      return;
    }

    if (passwordData.nove_heslo !== passwordData.potvrzeni_hesla) {
      setError('Nová hesla se neshodují.');
      return;
    }

    if (passwordData.nove_heslo.length < 6) {
      setError('Nové heslo musí mít alespoň 6 znaků.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post('/auth/change-password', {
        stare_heslo: passwordData.stare_heslo,
        nove_heslo: passwordData.nove_heslo,
      });

      setMessage('Heslo bylo úspěšně změněno.');
      setPasswordData({
        stare_heslo: '',
        nove_heslo: '',
        potvrzeni_hesla: '',
      });
    } catch (requestError) {
      console.error('Chyba při změně hesla:', requestError);
      setError(requestError.response?.data?.error || 'Změna hesla se nepovedla.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">Nastavení účtu</span>
        <h1 className="page-hero__title">Nastavení</h1>
        <p className="page-hero__text">Jen to podstatné: jazyk rozhraní a změna hesla.</p>
      </section>

      <div className="grid-2">
        <Card>
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">Jazyk</h2>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="jazyk">
              Jazyk
            </label>
            <select id="jazyk" className="ui-input" value={language} disabled>
              <option value="cs">Čeština</option>
            </select>
          </div>
        </Card>

        <Card>
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">Bezpečnost</h2>
              <p className="ui-card__subtitle">Změňte si heslo kdykoliv, když budete chtít mít jistotu.</p>
            </div>
          </div>

          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handlePasswordSubmit}>
            <div className="field-group">
              <label className="field-label" htmlFor="stare_heslo">
                Stávající heslo
              </label>
              <input
                id="stare_heslo"
                className="ui-input"
                type="password"
                name="stare_heslo"
                value={passwordData.stare_heslo}
                onChange={handlePasswordChange}
                disabled={loading}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="nove_heslo">
                Nové heslo
              </label>
              <input
                id="nove_heslo"
                className="ui-input"
                type="password"
                name="nove_heslo"
                value={passwordData.nove_heslo}
                onChange={handlePasswordChange}
                disabled={loading}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="potvrzeni_hesla">
                Potvrzení nového hesla
              </label>
              <input
                id="potvrzeni_hesla"
                className="ui-input"
                type="password"
                name="potvrzeni_hesla"
                value={passwordData.potvrzeni_hesla}
                onChange={handlePasswordChange}
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Ukládám změnu…' : 'Uložit nové heslo'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Nastaveni;
