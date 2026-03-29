import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError('Zadejte email.');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(cleanEmail);
      setMessage(
        response?.message ||
          'Pokud účet existuje, poslali jsme email s odkazem pro obnovu hesla.'
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Žádost o obnovu hesla se nepovedla.');
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
            <span className="auth-kicker">Obnova přístupu</span>
            <h1>Vrátíme vás zpátky do účtu</h1>
            <p>
              Zadejte svůj email a pošleme vám bezpečný odkaz, přes který si nastavíte nové heslo.
            </p>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Zapomenuté heslo</h2>
              <p>Po odeslání žádosti zkontrolujte schránku i spam. Odkaz má omezenou platnost.</p>
            </div>

            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input className="ui-input" type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vas@email.cz" />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Odesílám odkaz…' : 'Poslat odkaz pro nové heslo'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Už si heslo pamatujete?
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

export default ForgotPassword;
