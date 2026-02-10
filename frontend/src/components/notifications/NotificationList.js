import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationList = () => {
    const { oznameni, oznacitPrectene } = useNotifications();
    const navigate = useNavigate();

    const handleClick = (o) => {
        oznacitPrectene(o.id);
        if (o.typ === 'chat' && o.odesilatel_id) {
            navigate(`/chat/${o.odesilatel_id}`);
        }
        // případně můžeš přidat další typy oznámení a jejich navigaci
    };

    if (oznameni.length === 0) {
        return <div style={{ padding: '10px', color: '#555' }}>Žádná nová oznámení</div>;
    }

    return (
        <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
        }}>
            {oznameni.map(o => (
                <div
                    key={o.id}
                    onClick={() => handleClick(o)}
                    style={{
                        padding: '10px',
                        cursor: 'pointer',
                        backgroundColor: o.precteno ? '#f0f0f0' : '#fff',
                        borderBottom: '1px solid #ccc',
                        transition: 'background-color 0.3s ease',
                    }}
                >
                    <div style={{ fontWeight: o.precteno ? 'normal' : 'bold' }}>{o.zprava}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        {new Date(o.datum).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationList;
