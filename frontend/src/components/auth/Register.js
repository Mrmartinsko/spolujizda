import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
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
    const email = (formData.email || '').trim().toLowerCase();
    const telefon = (formData.telefon || '').trim();
    const password = formData.password || '';
    const confirmPassword = formData.confirmPassword || '';
    const phoneRegex = /^(?:\+\d{1,3}[\s-]?)?(?:\d{3}[\s-]?){2}\d{3}$/;

    if (!jmeno || !email || !telefon || !password || !confirmPassword) {
      setError('VyplĹte vĹˇechna pole.');
      return;
    }

    if (jmeno.length > 50) {
      setError('Jmeno muze mit maximalne 50 znaku.');
      return;
    }

    if (!phoneRegex.test(telefon)) {
      setError('Telefon zadejte treba ve formatu +420 123 456 789.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hesla se neshoduji.');
      return;
    }

    if (password.length < 6) {
      setError('Heslo musi mit alespon 6 znaku.');
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
      setError(getApiErrorMessage(err, 'Registrace se nepovedla.'));
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
            <span className="auth-kicker">NovĂ˝ ĂşÄŤet</span>
            <h1>PĹ™ipojte se ke ĹˇkolnĂ­ komunitÄ› na cestĂˇch</h1>
            <p>
              Po registraci budete moct rovnou nabĂ­zet jĂ­zdy, rezervovat mĂ­sta a psĂˇt ostatnĂ­m bez zbyteÄŤnĂ˝ch krokĹŻ navĂ­c.
            </p>
            <div className="auth-points">
              <div className="auth-point">OvÄ›Ĺ™enĂ˝ email pro bezpeÄŤnÄ›jĹˇĂ­ domluvu.</div>
              <div className="auth-point">JednotnĂ˝ pĹ™ehled jĂ­zd, aut i rezervacĂ­.</div>
              <div className="auth-point">JednoduchĂ© hodnocenĂ­ po dokonÄŤenĂ­ cesty.</div>
            </div>
          </aside>

          <section className="auth-form-panel">
            <div className="auth-header">
              <h2>Registrace</h2>
              <p>StaÄŤĂ­ pĂˇr ĂşdajĹŻ a ĂşÄŤet bude pĹ™ipravenĂ˝ bÄ›hem chvilky.</p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-group">
                <label className="field-label" htmlFor="jmeno">
                  UĹľivatelskĂ© jmĂ©no
                </label>
                <input className="ui-input" type="text" id="jmeno" name="jmeno" value={formData.jmeno} onChange={handleChange} required maxLength={50} placeholder="NapĹ™. Jana NovĂˇkovĂˇ" />
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
                <input className="ui-input" type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="MinimĂˇlnÄ› 6 znakĹŻ" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="confirmPassword">
                  PotvrzenĂ­ hesla
                </label>
                <input className="ui-input" type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Zadejte heslo znovu" />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'VytvĂˇĹ™Ă­m ĂşÄŤetâ€¦' : 'VytvoĹ™it ĂşÄŤet'}
              </Button>
            </form>

            <div className="auth-footer">
              <p>
                UĹľ ĂşÄŤet mĂˇte?
                <Link to="/login" className="auth-link">
                  PĹ™ihlaste se
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
