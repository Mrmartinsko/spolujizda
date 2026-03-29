import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const VerifyEmailToken = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const verify = async () => {
      try {
        await axios.get(`http://localhost:5000/api/auth/verify-email/${token}`);
        setStatus('ok');
        setMessage('Email byl úspěšně ověřen.');
      } catch (err) {
        const data = err.response?.data;
        const msg = data?.error || 'Email se nepodařilo ověřit.';
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
      setMessage('Chybí ověřovací token.');
    }
  }, [token]);

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <aside className="auth-aside">
            <div className="auth-brand">S</div>
            <span className="auth-kicker">Potvrzení účtu</span>
            <h1>Ověřujeme, že je email opravdu váš</h1>
            <p>
              Jakmile je email potvrzený, aplikace vás pustí do všech důležitých částí bez dalších omezení.
            </p>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Ověření emailu</h2>
              {status === 'loading' && <p>Ověřuji odkaz…</p>}
              {status !== 'loading' && <p>{message}</p>}
            </div>

            {status === 'ok' && (
              <div className="auth-panel-stack">
                <Alert variant="success">Email je ověřený a účet je připravený.</Alert>
                <Button as={Link} to="/login">
                  Pokračovat na přihlášení
                </Button>
              </div>
            )}

            {(status === 'expired' || status === 'invalid') && (
              <div className="auth-panel-stack">
                <Alert variant="error">Odkaz je neplatný nebo už vypršel. Pošlete si nový ověřovací email.</Alert>
                <Button as={Link} to="/verify-email">
                  Poslat ověření znovu
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="auth-panel-stack">
                <Alert variant="error">Nastala chyba. Zkuste to znovu, případně si pošlete nové ověření.</Alert>
                <Button as={Link} to="/verify-email" variant="secondary">
                  Otevřít ověření emailu
                </Button>
              </div>
            )}

            {status !== 'ok' && (
              <div className="auth-footer">
                <p>
                  <Link to="/login" className="auth-link">
                    Přihlášení
                  </Link>
                  {' • '}
                  <Link to="/verify-email" className="auth-link">
                    Poslat ověření znovu
                  </Link>
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailToken;
