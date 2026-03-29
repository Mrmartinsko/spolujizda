import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../../services/api';
import './ProfileSearch.css';

const ProfileSearch = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const tRef = useRef(null);
  const query = useMemo(() => q.trim(), [q]);
  const shouldSearch = query.length >= 2;

  const searchUsers = async (text) => {
    const res = await api.get('/uzivatele/hledat', { params: { q: text } });
    return res.data.uzivatele || [];
  };

  useEffect(() => {
    if (!open) return undefined;

    if (!shouldSearch) {
      setResults([]);
      setLoading(false);
      if (tRef.current) clearTimeout(tRef.current);
      return undefined;
    }

    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchUsers(query);
        setResults(found);
      } catch (error) {
        console.error('Chyba při vyhledávání profilů:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [open, query, shouldSearch]);

  const clear = () => {
    setQ('');
    setResults([]);
  };

  const closeAfterPick = () => {
    setOpen(false);
    setQ('');
    setResults([]);
    setLoading(false);
  };

  return (
    <div
      className="psWrap"
      tabIndex={-1}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <div className={`psPill ${open ? 'psPillOpen' : ''}`}>
        <Search size={18} className="psIcon" />
        <input
          className="psInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hledat spolužáka nebo řidiče"
        />
        {q && (
          <button className="psClear" onClick={clear} aria-label="Smazat" type="button">
            <X size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="psDropdown">
          {!shouldSearch && <div className="psHint">Napište aspoň 2 znaky.</div>}
          {shouldSearch && loading && <div className="psHint">Vyhledávám...</div>}
          {shouldSearch && !loading && results.length === 0 && (
            <div className="psHint">Nikdo takový nebyl nalezen.</div>
          )}

          {results.map((profil) => (
            <Link key={profil.id} to={`/profil/${profil.id}`} className="psItem" onClick={closeAfterPick}>
              <div
                className="psAvatar"
                style={profil.fotka ? { backgroundImage: `url(${profil.fotka})` } : undefined}
              >
                {!profil.fotka && (profil.jmeno?.charAt(0)?.toUpperCase() || 'U')}
              </div>

              <div className="psInfo">
                <div className="psName">{profil.jmeno || profil.username || 'Uživatel'}</div>
                <div className="psMeta">
                  {profil.hodnoceni_ridic ? (
                    <span>Řidič • {Number(profil.hodnoceni_ridic).toFixed(1)}</span>
                  ) : (
                    <span>Řidič</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileSearch;
