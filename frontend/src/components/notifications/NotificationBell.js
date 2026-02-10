import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
    const { oznameni, oznacitPrectene } = useNotifications();
    const [open, setOpen] = useState(false);

    const neprectena = oznameni.filter(o => !o.precteno);

    const handleClick = (id) => {
        oznacitPrectene(id);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Zvoneček */}
            <button onClick={() => setOpen(prev => !prev)} style={{ fontSize: '1.5rem', cursor: 'pointer', position: 'relative' }}>
                🔔
                {neprectena.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '0.75rem'
                    }}>
                        {neprectena.length}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '30px',
                    right: '0',
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    padding: '10px'
                }}>
                    {oznameni.length === 0 ? (
                        <p>Žádná oznámení</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {oznameni.map(o => (
                                <li key={o.id} style={{
                                    background: o.precteno ? '#eee' : '#f8f8f8',
                                    padding: '8px',
                                    marginBottom: '5px',
                                    borderRadius: '5px'
                                }}>
                                    <div>
                                        <strong>{o.typ}</strong>: {o.zprava}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                        {new Date(o.datum).toLocaleString('cs-CZ')}
                                    </div>
                                    {!o.precteno && (
                                        <button onClick={() => handleClick(o.id)} style={{ marginTop: '5px', fontSize: '0.8rem' }}>
                                            Označit jako přečtené
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
