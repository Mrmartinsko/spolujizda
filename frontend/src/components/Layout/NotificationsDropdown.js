import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const NotificationsDropdown = () => {
  const { oznameni, oznacitPrectene } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const neprectenaCount = useMemo(
    () => oznameni.reduce((acc, o) => acc + (o.precteno ? 0 : 1), 0),
    [oznameni]
  );

  return (
    <div
      className="notifWrap"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="iconBtn"
        type="button"
        onClick={() => setOpen((p) => !p)}
        title="Oznámení"
        style={{ position: 'relative' }}
      >
        🔔
        {neprectenaCount > 0 && <span className="notifCount">{neprectenaCount}</span>}
      </button>

      {open && (
        <div className="dropdownCard notifCard">
          {oznameni.length === 0 && (
            <div className="dropdownEmpty">Žádná oznámení</div>
          )}

          {oznameni.map((o) => (
            <div
              key={o.id}
              className={`notifItem ${o.precteno ? '' : 'notifUnread'}`}
              onClick={() => {
                oznacitPrectene(o.id);

                if (o.typ === 'chat' && o.odesilatel_id) navigate(`/chat/${o.odesilatel_id}`);
                else if (o.typ === 'rezervace' && o.rezervace_id) navigate(`/rezervace/${o.rezervace_id}`);

                setOpen(false);
              }}
            >
              <div>{o.zprava}</div>
              <div className="notifTime">{new Date(o.datum).toLocaleString('cs-CZ')}</div>

              {!o.precteno && (
                <button
                  className="notifMarkBtn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    oznacitPrectene(o.id);
                  }}
                >
                  Označit jako přečtené
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
