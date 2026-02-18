import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
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
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            const data = err.response?.data;

            // pokud backend vrátí 403 + requires_email_verification
            if (err.response?.status === 403 && data?.requires_email_verification) {
                navigate('/verify-email', {
                    state: { email: data.email || formData.email }
                });
                return;
            }

            if (err.response?.status === 401) {
                setError('Špatné přihlašovací údaje');
                return;
            }

            // běžná chyba
            setError(data?.error || 'Chyba při přihlašování');
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="auth-container">
            <div className="auth-wrapper">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>Přihlášení</h2>
                        <p>Přihlaste se do svého účtu</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
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
                            <label htmlFor="password">Heslo</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Zadejte vaše heslo"
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-button"
                            disabled={loading}
                        >
                            {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Nemáte účet?
                            <Link to="/register" className="auth-link">
                                Zaregistrujte se
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
