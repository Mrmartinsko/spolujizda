import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = (formData.email || '').trim().toLowerCase();
    const password = formData.password || '';

    if (!email || !password) {
      setError('Vyplnte email a heslo.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;

      if (err.response?.status === 403 && data?.requires_email_verification) {
        navigate('/verify-email', {
          state: { email: data.email || email },
        });
        return;
      }

      if (err.response?.status === 401) {
        setError('Zadany email nebo heslo nesedi.');
        return;
      }

      setError(getApiErrorMessage(err, 'Prihlaseni se nepovedlo.'));
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
            <span className="auth-kicker">SpolujĂ­zda</span>
            <h1>Cesty mezi lidmi, ne jen mezi mÄ›sty</h1>
            <p>
              PĹ™ihlaste se a mÄ›jte po ruce svĂ© jĂ­zdy, rezervace, zprĂˇvy i hodnocenĂ­ v jednom pĹ™ehlednĂ©m prostoru.
            </p>
            <div className="auth-points">
              <div className="auth-point">RychlĂ© rezervace bez zmatkĹŻ v konverzacĂ­ch.</div>
              <div className="auth-point">PĹ™Ă­mĂ© napojenĂ­ na chat a oznĂˇmenĂ­.</div>
              <div className="auth-point">StudentskĂ© prostĹ™edĂ­ bez zbyteÄŤnĂ©ho balastu.</div>
            </div>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>PĹ™ihlĂˇĹˇenĂ­</h2>
              <p>PĹ™ihlaste se do svĂ©ho ĂşÄŤtu a pokraÄŤujte tam, kde jste naposledy skonÄŤili.</p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="ui-input"
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="vas@email.cz"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">
                  Heslo
                </label>
                <input
                  className="ui-input"
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Zadejte svĂ© heslo"
                />
              </div>

              <div className="auth-inline-links">
                <Link to="/forgot-password" className="auth-link auth-link-inline">
                  ZapomenutĂ© heslo?
                </Link>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'PĹ™ihlaĹˇujiâ€¦' : 'PĹ™ihlĂˇsit se'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                NemĂˇte ĂşÄŤet?
                <Link to="/register" className="auth-link">
                  Zaregistrujte se
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
