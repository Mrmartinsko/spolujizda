import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyResetToken, resetPassword } = useAuth();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const verifyToken = async () => {
      try {
        await verifyResetToken(token);
        setStatus('ready');
      } catch (err) {
        const msg = err.response?.data?.error || 'Odkaz pro obnovu hesla se nepodařilo ověřit.';
        setStatus('invalid');
        setMessage(msg);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setStatus('invalid');
      setMessage('Chybí resetovací token.');
    }
  }, [token, verifyResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!password || !confirmPassword) {
      setMessage('Vyplňte obě pole.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Hesla se neshodují.');
      return;
    }

    if (password.length < 6) {
      setMessage('Nové heslo musí mít alespoň 6 znaků.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setStatus('success');
      setMessage('Heslo bylo změněno. Za chvíli vás přesměrujeme na přihlášení.');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      const msg = err.response?.data?.error || 'Obnova hesla se nepovedla.';
      setStatus('ready');
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <aside className="auth-aside">
            <div className="auth-brand">S</div>
            <span className="auth-kicker">Nové heslo</span>
            <h1>Nastavte si heslo znovu a bezpečně</h1>
            <p>
              Odkaz je jednorázový a časově omezený. Po úspěšném uložení už starý token znovu fungovat nebude.
            </p>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Obnovení hesla</h2>
              {status === 'loading' && <p>Ověřuji odkaz…</p>}
              {status === 'ready' && <p>Zadejte nové heslo a potvrďte ho.</p>}
              {status === 'success' && <p>Všechno proběhlo v pořádku.</p>}
            </div>

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="auth-form">
                {message && <Alert variant="error">{message}</Alert>}

                <div className="field-group">
                  <label className="field-label" htmlFor="password">
                    Nové heslo
                  </label>
                  <input className="ui-input" type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimálně 6 znaků" />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="confirmPassword">
                    Potvrzení nového hesla
                  </label>
                  <input className="ui-input" type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Zadejte heslo znovu" />
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Ukládám nové heslo…' : 'Uložit nové heslo'}
                </Button>
              </form>
            )}

            {status === 'success' && <Alert variant="success">{message}</Alert>}

            {status === 'invalid' && (
              <div className="auth-panel-stack">
                <Alert variant="error">{message}</Alert>
                <Button as={Link} to="/forgot-password">
                  Požádat o nový odkaz
                </Button>
              </div>
            )}

            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">
                  Zpět na přihlášení
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
