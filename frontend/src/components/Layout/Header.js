import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileSearch from './ProfileSearch';
import NotificationsDropdown from './NotificationsDropdown';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="header">
      <div className="headerRow">
        <div className="headerLeft">{/* breadcrumbs */}</div>

        <div className="headerRight">
          <ProfileSearch />

          {/* ✅ Nové notifikace jako samostatná komponenta */}
          <NotificationsDropdown />

          {/* Profil */}
          <div
            className="profileWrap"
            tabIndex={-1}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowDropdown(false);
              }
            }}
          >
            <button
              className="profileBtn"
              onClick={() => setShowDropdown((p) => !p)}
              type="button"
            >
              <div className="profileAvatar">
                {user?.profil?.jmeno?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="profileName">
                {user?.profil?.jmeno || 'Uživatel'}
              </span>
              <span className="profileCaret">▼</span>
            </button>

            {showDropdown && (
              <div className="dropdownCard profileCard">
                <Link
                  to="/profil"
                  className="dropdownLink"
                  onClick={() => setShowDropdown(false)}
                >
                  Můj profil
                </Link>
                <Link
                  to="/nastaveni"
                  className="dropdownLink"
                  onClick={() => setShowDropdown(false)}
                >
                  Nastavení
                </Link>
                <button
                  className="dropdownDanger"
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                  type="button"
                >
                  Odhlásit se
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
