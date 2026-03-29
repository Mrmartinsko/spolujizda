import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;

      if (err.response?.status === 403 && data?.requires_email_verification) {
        navigate('/verify-email', {
          state: { email: data.email || formData.email },
        });
        return;
      }

      if (err.response?.status === 401) {
        setError('Zadaný email nebo heslo nesedí.');
        return;
      }

      setError(data?.error || 'Přihlášení se nepovedlo.');
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
            <span className="auth-kicker">Spolujízda</span>
            <h1>Cesty mezi lidmi, ne jen mezi městy</h1>
            <p>
              Přihlaste se a mějte po ruce své jízdy, rezervace, zprávy i hodnocení v jednom přehledném prostoru.
            </p>
            <div className="auth-points">
              <div className="auth-point">Rychlé rezervace bez zmatků v konverzacích.</div>
              <div className="auth-point">Přímé napojení na chat a oznámení.</div>
              <div className="auth-point">Studentské prostředí bez zbytečného balastu.</div>
            </div>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Přihlášení</h2>
              <p>Přihlaste se do svého účtu a pokračujte tam, kde jste naposledy skončili.</p>
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
                  placeholder="Zadejte své heslo"
                />
              </div>

              <div className="auth-inline-links">
                <Link to="/forgot-password" className="auth-link auth-link-inline">
                  Zapomenuté heslo?
                </Link>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Přihlašuji…' : 'Přihlásit se'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Nemáte účet?
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
