import React from 'react';
import { Link } from 'react-router-dom';

const Domovska = () => {
    return (
        <div>
            <div className="card" style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ marginBottom: '20px', color: '#007bff' }}>
                    Vítejte ve Spolujízdě! 🚗
                </h1>
                <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
                    Najděte spolucestující nebo nabídněte svou jízdu
                </p>

                <div className="grid grid-2" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <Link to="/nabidnout-jizdu" className="btn btn-primary" style={{ textDecoration: 'none', padding: '15px' }}>
                        🚗 Nabídnout jízdu
                    </Link>
                    <Link to="/vyhledat-jizdu" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '15px' }}>
                        🔍 Vyhledat jízdu
                    </Link>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3 style={{ marginBottom: '15px' }}>📋 Rychlé akce</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Link to="/moje-jizdy" style={{ textDecoration: 'none', color: '#007bff' }}>
                            → Moje jízdy
                        </Link>
                        <Link to="/chat" style={{ textDecoration: 'none', color: '#007bff' }}>
                            → Chat
                        </Link>
                        <Link to="/profil" style={{ textDecoration: 'none', color: '#007bff' }}>
                            → Můj profil
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '15px' }}>ℹ️ Jak to funguje</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '8px' }}>✅ Registrujte se a vytvořte profil</li>
                        <li style={{ marginBottom: '8px' }}>✅ Přidejte své auto</li>
                        <li style={{ marginBottom: '8px' }}>✅ Nabídněte jízdu nebo hledejte místo</li>
                        <li style={{ marginBottom: '8px' }}>✅ Komunikujte přes chat</li>
                        <li style={{ marginBottom: '8px' }}>✅ Hodnoťte se navzájem</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Domovska;
