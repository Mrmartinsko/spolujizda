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
    if (!open) return;

    if (!shouldSearch) {
      setResults([]);
      setLoading(false);
      if (tRef.current) clearTimeout(tRef.current);
      return;
    }

    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchUsers(query);
        setResults(r);
      } catch (e) {
        console.error('Chyba při vyhledávání:', e);
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
        // zavři jen když focus odchází mimo celý search wrap
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
          placeholder="Hledat profil"
        />
        {q && (
          <button
            className="psClear"
            onClick={clear}
            aria-label="Smazat"
            type="button"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="psDropdown">
          {!shouldSearch && <div className="psHint">Napiš aspoň 2 znaky</div>}
          {shouldSearch && loading && <div className="psHint">Vyhledává se…</div>}
          {shouldSearch && !loading && results.length === 0 && (
            <div className="psHint">Žádné výsledky</div>
          )}

          {results.map((profil) => (
            <Link
              key={profil.id}
              to={`/profil/${profil.id}`}
              className="psItem"
              onClick={closeAfterPick}
            >
              <div
                className="psAvatar"
                style={{
                  backgroundImage: profil.fotka ? `url(${profil.fotka})` : 'none',
                }}
              >
                {!profil.fotka && (profil.jmeno?.charAt(0)?.toUpperCase() || 'U')}
              </div>

              <div className="psInfo">
                <div className="psName">{profil.jmeno}</div>
                <div className="psMeta">
                  {profil.hodnoceni_ridic && (
                    <span>Řidič ⭐ {Number(profil.hodnoceni_ridic).toFixed(1)}</span>
                  )}
                  {profil.hodnoceni_pasazer && (
                    <span>Pasažér ⭐ {Number(profil.hodnoceni_pasazer).toFixed(1)}</span>
                  )}
                  {!profil.hodnoceni_ridic && !profil.hodnoceni_pasazer && (
                    <span>Nový uživatel</span>
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
