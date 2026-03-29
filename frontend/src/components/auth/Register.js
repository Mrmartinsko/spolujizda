import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    jmeno: '',
    email: '',
    telefon: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
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

    const jmeno = (formData.jmeno || '').trim();
    const email = (formData.email || '').trim();
    const telefon = (formData.telefon || '').trim();
    const password = formData.password || '';
    const confirmPassword = formData.confirmPassword || '';
    const phoneRegex = /^(?:\+\d{1,3}[\s-]?)?(?:\d{3}[\s-]?){2}\d{3}$/;

    if (!jmeno || !email || !telefon || !password || !confirmPassword) {
      setError('Vyplňte všechna pole.');
      return;
    }

    if (jmeno.length > 20) {
      setError('Jméno může mít maximálně 20 znaků.');
      return;
    }

    if (!phoneRegex.test(telefon)) {
      setError('Telefon zadejte třeba ve formátu +420 123 456 789.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hesla se neshodují.');
      return;
    }

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků.');
      return;
    }

    setLoading(true);

    try {
      await register({
        jmeno,
        email,
        telefon,
        password,
      });

      navigate('/verify-email', { state: { email } });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Registrace se nepovedla.');
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
            <span className="auth-kicker">Nový účet</span>
            <h1>Připojte se ke školní komunitě na cestách</h1>
            <p>
              Po registraci budete moct rovnou nabízet jízdy, rezervovat místa a psát ostatním bez zbytečných kroků navíc.
            </p>
            <div className="auth-points">
              <div className="auth-point">Ověřený email pro bezpečnější domluvu.</div>
              <div className="auth-point">Jednotný přehled jízd, aut i rezervací.</div>
              <div className="auth-point">Jednoduché hodnocení po dokončení cesty.</div>
            </div>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Registrace</h2>
              <p>Stačí pár údajů a účet bude připravený během chvilky.</p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-group">
                <label className="field-label" htmlFor="jmeno">
                  Uživatelské jméno
                </label>
                <input className="ui-input" type="text" id="jmeno" name="jmeno" value={formData.jmeno} onChange={handleChange} required maxLength={20} placeholder="Např. Jana Nováková" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input className="ui-input" type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="vas@email.cz" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="telefon">
                  Telefon
                </label>
                <input className="ui-input" type="tel" id="telefon" name="telefon" value={formData.telefon} onChange={handleChange} required placeholder="+420 123 456 789" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">
                  Heslo
                </label>
                <input className="ui-input" type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Minimálně 6 znaků" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="confirmPassword">
                  Potvrzení hesla
                </label>
                <input className="ui-input" type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Zadejte heslo znovu" />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Vytvářím účet…' : 'Vytvořit účet'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                Už účet máte?
                <Link to="/login" className="auth-link">
                  Přihlaste se
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Register;
