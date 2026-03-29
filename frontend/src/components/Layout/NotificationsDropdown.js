import React, { useMemo, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const FILTERS = [
  { id: 'all', label: 'Vše' },
  { id: 'zpravy', label: 'Zprávy' },
  { id: 'rezervace', label: 'Rezervace' },
  { id: 'jizdy', label: 'Jízdy' },
  { id: 'hodnoceni', label: 'Hodnocení' },
];

const CATEGORY_LABELS = {
  zpravy: 'Zprávy',
  rezervace: 'Rezervace',
  jizdy: 'Jízdy',
  hodnoceni: 'Hodnocení',
};

const NotificationsDropdown = () => {
  const { oznameni, oznacitPrectene } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const neprectenaCount = useMemo(
    () => oznameni.reduce((acc, item) => acc + (item.precteno ? 0 : 1), 0),
    [oznameni]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return oznameni;
    return oznameni.filter((item) => item.kategorie === activeFilter);
  }, [activeFilter, oznameni]);

  const handleOpenNotification = async (notification) => {
    if (!notification.precteno) {
      await oznacitPrectene(notification.id);
    }

    if (notification.target_path) {
      navigate(notification.target_path);
    } else if (notification.typ === 'chat' && notification.odesilatel_id) {
      navigate(`/chat/${notification.odesilatel_id}`);
    }

    setOpen(false);
  };

  return (
    <div
      className="notifWrap"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button className="iconBtn" type="button" onClick={() => setOpen((prev) => !prev)} title="Oznámení">
        <Bell size={19} />
        {neprectenaCount > 0 && <span className="notifCount">{neprectenaCount}</span>}
      </button>

      {open && (
        <div className="dropdownCard notifCard">
          <div className="notifCard__header">
            <div>
              <h3 className="notifCard__title">Oznámení</h3>
              <p className="notifCard__text">
                {neprectenaCount > 0
                  ? `Nepřečtených oznámení: ${neprectenaCount}`
                  : 'Všechno máte přečtené.'}
              </p>
            </div>
          </div>

          <div className="notifFilters">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`notifFilterBtn ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="dropdownEmpty">
              {oznameni.length === 0
                ? 'Zatím tu nic není. Nové zprávy, rezervace i hodnocení se ukážou právě tady.'
                : 'Pro vybraný filtr tu teď nic není.'}
            </div>
          ) : (
            <div className="notifList">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notifItem ${notification.precteno ? '' : 'notifUnread'}`}
                  onClick={() => handleOpenNotification(notification)}
                >
                  <div className="notifTopRow">
                    <div className="notifMeta">
                      {!notification.precteno && <span className="notifUnreadDot" />}
                      <span className="notifCategory">
                        {CATEGORY_LABELS[notification.kategorie] || 'Ostatní'}
                      </span>
                    </div>
                    <span className="notifTime">
                      {new Date(notification.datum).toLocaleString('cs-CZ')}
                    </span>
                  </div>

                  <p className="notifMessage">{notification.zprava}</p>

                  <div className="notifActions">
                    <span className="notifLinkHint">
                      Otevřít detail <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </span>
                    {!notification.precteno && (
                      <span
                        className="notifMarkBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          oznacitPrectene(notification.id);
                        }}
                      >
                        Označit jako přečtené
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
