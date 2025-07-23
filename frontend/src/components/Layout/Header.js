import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <header style={{
            backgroundColor: 'white',
            padding: '15px 20px',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                {/* Místo pro breadcrumbs nebo aktuální stránku */}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Ikona pro vyhledávání profilů */}
                <button style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '5px'
                }}>
                    🔍
                </button>

                {/* Ikona pro oznámení */}
                <button style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '5px'
                }}>
                    🔔
                </button>

                {/* Profil dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '5px'
                        }}
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#007bff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            {user?.profil?.jmeno?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span>{user?.profil?.jmeno || 'Uživatel'}</span>
                        <span style={{ fontSize: '12px' }}>▼</span>
                    </button>

                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            minWidth: '150px',
                            zIndex: 1000
                        }}>
                            <Link
                                to="/profil"
                                style={{
                                    display: 'block',
                                    padding: '10px 15px',
                                    textDecoration: 'none',
                                    color: '#333',
                                    borderBottom: '1px solid #f8f9fa'
                                }}
                                onClick={() => setShowDropdown(false)}
                            >
                                Můj profil
                            </Link>
                            <Link
                                to="/nastaveni"
                                style={{
                                    display: 'block',
                                    padding: '10px 15px',
                                    textDecoration: 'none',
                                    color: '#333',
                                    borderBottom: '1px solid #f8f9fa'
                                }}
                                onClick={() => setShowDropdown(false)}
                            >
                                Nastavení
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    setShowDropdown(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 15px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    color: '#dc3545'
                                }}
                            >
                                Odhlásit se
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
