import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    jmeno: '',
    email: '',
    telefon: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    if (formData.password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků');
      return;
    }

    setLoading(true);

    try {
      await register({
        jmeno: formData.jmeno,
        email: formData.email,
        telefon: formData.telefon,
        password: formData.password
      });

      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Chyba při registraci');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Registrace</h2>
            <p>Vytvořte si nový účet</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="jmeno">Jméno</label>
              <input
                type="text"
                id="jmeno"
                name="jmeno"
                value={formData.jmeno}
                onChange={handleChange}
                required
                placeholder="Zadejte vaše jméno"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Zadejte váš email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefon">Telefon</label>
              <input
                type="tel"
                id="telefon"
                name="telefon"
                value={formData.telefon}
                onChange={handleChange}
                required
                placeholder="Zadejte váš telefon"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Heslo</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Zadejte heslo (min. 6 znaků)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Potvrdit heslo</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Zadejte heslo znovu"
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Registruji...' : 'Zaregistrovat se'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Už máte účet?
              <Link to="/login" className="auth-link">
                Přihlaste se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
