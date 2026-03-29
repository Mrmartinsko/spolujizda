import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileSearch from './ProfileSearch';
import NotificationsDropdown from './NotificationsDropdown';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__intro">
          <span className="header__eyebrow">Komunitní spolujízda</span>
          <div>
            <h1 className="header__title">Ahoj, {user?.profil?.jmeno || 'vítej'}.</h1>
            <p className="header__subtitle">Naplánuj cestu, spravuj rezervace a zůstaň ve spojení s ostatními.</p>
          </div>
        </div>

        <div className="header__actions">
          <ProfileSearch />
          <NotificationsDropdown />

          <div
            className="profileWrap"
            tabIndex={-1}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowDropdown(false);
              }
            }}
          >
            <button className="profileBtn" type="button" onClick={() => setShowDropdown((prev) => !prev)}>
              <div className="profileAvatar">{user?.profil?.jmeno?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="profileMeta">
                <span className="profileMeta__name">{user?.profil?.jmeno || 'Uživatel'}</span>
                <span className="profileMeta__email">{user?.email || 'Přihlášený účet'}</span>
              </div>
              <ChevronDown size={16} className={`profileCaret ${showDropdown ? 'is-open' : ''}`} />
            </button>

            {showDropdown && (
              <div className="dropdownCard profileCard">
                <Link to="/profil" className="dropdownLink" onClick={() => setShowDropdown(false)}>
                  <UserRound size={16} />
                  <span>Můj profil</span>
                </Link>
                <Link to="/nastaveni" className="dropdownLink" onClick={() => setShowDropdown(false)}>
                  <Settings size={16} />
                  <span>Nastavení</span>
                </Link>
                <button
                  className="dropdownDanger"
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                  type="button"
                >
                  <LogOut size={16} />
                  <span>Odhlásit se</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
