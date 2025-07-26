import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/', label: 'Domů', icon: '🏠' },
        { path: '/nabidnout-jizdu', label: 'Nabídnout jízdu', icon: '🚗' },
        { path: '/vyhledat-jizdu', label: 'Vyhledat jízdu', icon: '🔍' },
        { path: '/moje-jizdy', label: 'Moje jízdy', icon: '📋' },
        { path: '/moje-rezervace', label: 'Moje rezervace', icon: '🎫' },
        { path: '/chat', label: 'Chat', icon: '💬' }
    ];

    return (
        <div style={{
            width: '250px',
            backgroundColor: 'var(--sidebar-bg)',
            color: 'var(--text-color)',
            padding: '20px',
            minHeight: '100vh',
            borderRight: '1px solid var(--sidebar-border)',
            transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease'
        }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{
                    color: 'var(--btn-primary-bg)',
                    marginBottom: '10px',
                    transition: 'color 0.3s ease'
                }}>
                    🚗 Spolujízda
                </h2>
            </div>

            <nav>
                {menuItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: 'block',
                            padding: '12px 16px',
                            marginBottom: '5px',
                            textDecoration: 'none',
                            color: 'var(--text-color)',
                            borderRadius: '4px',
                            backgroundColor: location.pathname === item.path ? 'var(--btn-primary-bg)' : 'transparent',
                            transition: 'background-color 0.2s, color 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            if (location.pathname !== item.path) {
                                e.target.style.backgroundColor = 'var(--bg-secondary)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (location.pathname !== item.path) {
                                e.target.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <span style={{ marginRight: '10px' }}>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;
