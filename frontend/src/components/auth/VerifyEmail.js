import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
      setError('Zadej prosím email, na který se má poslat ověřovací odkaz.');
      return;
    }

    setLoading(true);
    try {
      await resendVerification(cleanEmail);
      setInfo('Pokud účet existuje, ověřovací email byl znovu odeslán. Zkontroluj schránku.');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Nepodařilo se odeslat ověřovací email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Ověř email</h2>
            <p>
              Na tvůj email jsme poslali ověřovací odkaz. Klikni na něj a pak se přihlas.
            </p>
          </div>

          {info && <div className="success-message">{info}</div>}
          {error && <div className="error-message">{error}</div>}

          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Zadejte váš email"
              />
            </div>

            <button
              type="button"
              className="auth-button"
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? 'Odesílám...' : 'Poslat ověřovací email znovu'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Už jsi ověřil email?
              <Link to="/login" className="auth-link">
                Přihlásit se
              </Link>
            </p>
          </div>

          <div style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>
            Tip: v dev režimu uvidíš ověřovací link v Ethereal (nebo v backend konzoli jako <b>VERIFY LINK</b>).
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
