import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const VerifyEmail = () => {
  const location = useLocation();
  const { resendVerification } = useAuth();

  const initialEmail = useMemo(() => {
    return (location.state?.email || '').toLowerCase().trim();
  }, [location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setInfo('');

    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      setError('Zadejte email, na který se má poslat ověřovací odkaz.');
      return;
    }

    setLoading(true);
    try {
      await resendVerification(cleanEmail);
      setInfo('Pokud účet existuje, ověřovací email byl znovu odeslán. Zkontrolujte schránku.');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Ověřovací email se nepodařilo odeslat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <aside className="auth-aside">
            <div className="auth-brand">S</div>
            <span className="auth-kicker">Ověření emailu</span>
            <h1>Ještě jeden krok a účet je připravený</h1>
            <p>
              Po ověření emailu budete moct plnohodnotně používat rezervace, chat i další části aplikace.
            </p>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Ověřit email</h2>
              <p>Na zadaný email jsme poslali odkaz. Pokud nepřišel, můžete si ho nechat poslat znovu.</p>
            </div>

            {info && <Alert variant="success">{info}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input className="ui-input" type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vas@email.cz" />
              </div>

              <Button type="button" onClick={handleResend} disabled={loading}>
                {loading ? 'Odesílám…' : 'Poslat ověřovací email znovu'}
              </Button>
            </form>

            <div className="auth-info-box">
              V dev režimu najdete ověřovací odkaz i v Ethereal schránce nebo v backend konzoli jako <strong>VERIFY LINK</strong>.
            </div>

            <div className="auth-footer">
              <p>
                Už máte ověřeno?
                <Link to="/login" className="auth-link">
                  Přihlásit se
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
