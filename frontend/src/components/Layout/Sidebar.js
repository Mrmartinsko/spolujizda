import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CarFront,
  CircleUserRound,
  Home,
  MessageCircleMore,
  PlusCircle,
  Search,
  Settings,
  Ticket,
  Waypoints,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Přehled', icon: Home },
  { path: '/nabidnout-jizdu', label: 'Nabídnout jízdu', icon: PlusCircle },
  { path: '/vyhledat-jizdu', label: 'Vyhledat jízdu', icon: Search },
  { path: '/moje-jizdy', label: 'Moje jízdy', icon: Waypoints },
  { path: '/moje-rezervace', label: 'Moje rezervace', icon: Ticket },
  { path: '/moje-chaty', label: 'Osobní chaty', icon: MessageCircleMore },
  { path: '/auta', label: 'Garáž', icon: CarFront },
];

const secondaryItems = [
  { path: '/profil', label: 'Můj profil', icon: CircleUserRound },
  { path: '/nastaveni', label: 'Nastavení', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">S</div>
        <div>
          <div className="sidebar__brand-title">Spolujízda</div>
          <div className="sidebar__brand-text">Studentské cesty po škole i domů</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__section-label">Účet</div>
      <nav className="sidebar__nav sidebar__nav--secondary">
        {secondaryItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
