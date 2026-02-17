import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const VerifyEmailToken = () => {
  const { token } = useParams();

  const [status, setStatus] = useState('loading'); // loading | ok | expired | invalid | error
  const [message, setMessage] = useState('');
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const verify = async () => {
      try {
        await axios.get(`http://localhost:5000/api/auth/verify-email/${token}`);
        setStatus('ok');
        setMessage('Email úspěšně ověřen.');
      } catch (err) {
        const data = err.response?.data;
        const msg = data?.error || 'Nepodařilo se ověřit email.';

        const normalized = msg.toLowerCase();

        if (normalized.includes('vypršel') || normalized.includes('vyprsel')) {
          setStatus('expired');
        } else if (
          normalized.includes('neplatný') ||
          normalized.includes('neplatny') ||
          normalized.includes('použitý') ||
          normalized.includes('pouzity')
        ) {
          setStatus('invalid');
        } else {
          setStatus('error');
        }
        setMessage(msg);
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('invalid');
      setMessage('Chybí token.');
    }
  }, [token]);

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Ověření emailu</h2>
            {status === 'loading' && <p>Ověřuji...</p>}
            {status !== 'loading' && <p>{message}</p>}
          </div>

          {status === 'ok' && (
            <div className="success-message">
              Email je úspěšně ověřen.
              <div style={{ marginTop: 12 }}>
                <Link to="/login" className="auth-button">
                  Přihlásit se
                </Link>
              </div>
            </div>
          )}

          {(status === 'expired' || status === 'invalid') && (
            <div className="error-message">
              Odkaz je neplatný nebo vypršel. Zkus poslat ověřovací email znovu.
              <div style={{ marginTop: 12 }}>
                <Link to="/verify-email" className="auth-button">
                  Poslat ověření znovu
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="error-message">
              Nastala chyba. Zkus to prosím znovu nebo pošli ověření znovu.
              <div style={{ marginTop: 12 }}>
                <Link to="/verify-email" className="auth-button">
                  Poslat ověření znovu
                </Link>
              </div>
            </div>
          )}

          {status !== 'ok' && (
            <div className="auth-footer" style={{ marginTop: 10 }}>
              <p>
                <Link to="/login" className="auth-link">Přihlásit se</Link>
                {' '}nebo{' '}
                <Link to="/verify-email" className="auth-link">poslat ověření znovu</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailToken;
