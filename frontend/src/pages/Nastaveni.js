import React, { useState } from 'react';
import axios from 'axios';

const Nastaveni = () => {
    const [passwordData, setPasswordData] = useState({
        stare_heslo: '',
        nove_heslo: '',
        potvrzeni_hesla: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        // Vymazat zprávy při změně inputu
        if (message || error) {
            setMessage('');
            setError('');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        // Validace na frontendu
        if (!passwordData.stare_heslo || !passwordData.nove_heslo || !passwordData.potvrzeni_hesla) {
            setError('Všechna pole jsou povinná');
            return;
        }

        if (passwordData.nove_heslo !== passwordData.potvrzeni_hesla) {
            setError('Nová hesla se neshodují');
            return;
        }

        if (passwordData.nove_heslo.length < 6) {
            setError('Nové heslo musí mít alespoň 6 znaků');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5000/api/auth/change-password',
                {
                    stare_heslo: passwordData.stare_heslo,
                    nove_heslo: passwordData.nove_heslo
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setMessage('Heslo bylo úspěšně změněno');
            setPasswordData({
                stare_heslo: '',
                nove_heslo: '',
                potvrzeni_hesla: ''
            });
        } catch (error) {
            console.error('Chyba při změně hesla:', error);
            setError(error.response?.data?.error || 'Chyba při změně hesla');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div>
            <h1>Nastavení</h1>
            <div className="card">
                <h3>Obecné nastavení</h3>
                <div className="form-group">
                    <label className="form-label">Jazyk</label>
                    <select className="form-input">
                        <option value="cs">Čeština</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" />
                        Tmavý režim
                    </label>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" defaultChecked />
                        Emailová oznámení
                    </label>
                </div>

                <button className="btn btn-primary">
                    Uložit nastavení
                </button>
            </div>

            <div className="card">
                <h3>Změna hesla</h3>
                {message && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        border: '1px solid #c3e6cb'
                    }}>
                        {message}
                    </div>
                )}
                {error && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        border: '1px solid #f5c6cb'
                    }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                        <label className="form-label">Staré heslo</label>
                        <input
                            type="password"
                            name="stare_heslo"
                            value={passwordData.stare_heslo}
                            onChange={handlePasswordChange}
                            className="form-input"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nové heslo</label>
                        <input
                            type="password"
                            name="nove_heslo"
                            value={passwordData.nove_heslo}
                            onChange={handlePasswordChange}
                            className="form-input"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Potvrdit nové heslo</label>
                        <input
                            type="password"
                            name="potvrzeni_hesla"
                            value={passwordData.potvrzeni_hesla}
                            onChange={handlePasswordChange}
                            className="form-input"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Měním heslo...' : 'Změnit heslo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Nastaveni;
