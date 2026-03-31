import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
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
        response?.error ||
          response?.message ||
          'Pokud ĂşÄŤet existuje, poslali jsme email s odkazem pro obnovu hesla.'
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Zadost o obnovu hesla se nepovedla.'));
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
            <span className="auth-kicker">Obnova pĹ™Ă­stupu</span>
            <h1>VrĂˇtĂ­me vĂˇs zpĂˇtky do ĂşÄŤtu</h1>
            <p>
              Zadejte svĹŻj email a poĹˇleme vĂˇm bezpeÄŤnĂ˝ odkaz, pĹ™es kterĂ˝ si nastavĂ­te novĂ© heslo.
            </p>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>ZapomenutĂ© heslo</h2>
              <p>Po odeslĂˇnĂ­ ĹľĂˇdosti zkontrolujte schrĂˇnku i spam. Odkaz mĂˇ omezenou platnost.</p>
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
                {loading ? 'OdesĂ­lĂˇm odkazâ€¦' : 'Poslat odkaz pro novĂ© heslo'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                UĹľ si heslo pamatujete?
                <Link to="/login" className="auth-link">
                  PĹ™ihlĂˇsit se
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
