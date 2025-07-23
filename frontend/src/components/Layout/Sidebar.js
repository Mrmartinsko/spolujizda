import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/', label: 'Domů', icon: '🏠' },
        { path: '/nabidnout-jizdu', label: 'Nabídnout jízdu', icon: '🚗' },
        { path: '/vyhledat-jizdu', label: 'Vyhledat jízdu', icon: '🔍' },
        { path: '/moje-jizdy', label: 'Moje jízdy', icon: '📋' },
        { path: '/chat', label: 'Chat', icon: '💬' }
    ];

    return (
        <div style={{
            width: '250px',
            backgroundColor: '#343a40',
            color: 'white',
            padding: '20px',
            minHeight: '100vh'
        }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#007bff', marginBottom: '10px' }}>
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
                            color: 'white',
                            borderRadius: '4px',
                            backgroundColor: location.pathname === item.path ? '#007bff' : 'transparent',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                            if (location.pathname !== item.path) {
                                e.target.style.backgroundColor = '#495057';
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
