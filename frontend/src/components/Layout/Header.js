import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';



const Header = () => {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef(null);

    const toggleSearchBar = () => {
        setShowSearchBar(!showSearchBar);
        if (!showSearchBar) {
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    // Funkce pro vyhledávání uživatelů
    const searchUsers = async (query) => {
        try {
            const response = await api.get('/uzivatele/hledat', {
                params: { q: query }
            });
            return response.data.uzivatele || [];
        } catch (error) {
            console.error('Chyba při vyhledávání:', error);
            return [];
        }
    };

    // Debounced vyhledávání
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            searchTimeoutRef.current = setTimeout(async () => {
                setIsSearching(true);
                try {
                    const results = await searchUsers(searchQuery);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Chyba při vyhledávání:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    return (
        <header style={{
            backgroundColor: 'var(--card-bg)',
            padding: '15px 20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'row',
            color: 'var(--text-color)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
            }}>
                <div>
                    {/* Místo pro breadcrumbs nebo aktuální stránku */}
                </div>



                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>

                    {/* Vyhledávací řádek vedle lupy */}
                    {showSearchBar && (
                        <div style={{position: 'relative'}}>
                            <input
                                type="text"
                                placeholder="Vyhledat profil..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '250px',
                                    padding: '6px 10px',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--card-bg)',
                                    color: 'var(--text-color)',
                                    fontSize: '14px'
                                }}
                                autoFocus
                            />

                            {/* Výsledky vyhledávání */}
                            {(searchResults.length > 0 || isSearching) && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    zIndex: 1001
                                }}>
                                    {isSearching && (
                                        <div style={{
                                            padding: '10px',
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            Vyhledává se...
                                        </div>
                                    )}

                                    {searchResults.map((profil) => (
                                        <Link
                                            key={profil.id}
                                            to={`/profil/${profil.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                textDecoration: 'none',
                                                color: 'var(--text-color)',
                                                borderBottom: '1px solid var(--card-border)',
                                                gap: '10px'
                                            }}
                                            onClick={() => {
                                                setShowSearchBar(false);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                        >
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                backgroundColor: profil.fotka ? 'transparent' : '#007bff',
                                                backgroundImage: profil.fotka ? `url(${profil.fotka})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}>
                                                {!profil.fotka && (profil.jmeno?.charAt(0)?.toUpperCase() || 'U')}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{fontWeight: 'bold'}}>{profil.jmeno}</div>
                                                <div style={{fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px'}}>
                                                    {profil.hodnoceni_ridic && (
                                                        <span>Řidič: ⭐ {profil.hodnoceni_ridic.toFixed(1)}</span>
                                                    )}
                                                    {profil.hodnoceni_pasazer && (
                                                        <span>Pasažér: ⭐ {profil.hodnoceni_pasazer.toFixed(1)}</span>
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
                    )}


                    {/* Ikona pro vyhledávání profilů */}
                    <button style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '5px',
                        color: 'var(--text-color)',
                        transition: 'color 0.3s ease',
                    }}
                            title="Vyhledat profil"
                            onClick={toggleSearchBar}
                    >
                        🔍
                    </button>


                    {/* Ikona pro oznámení */}
                    <button style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '5px',
                        color: 'var(--text-color)',
                        transition: 'color 0.3s ease'
                    }}
                            title="Oznámení"
                    >
                        🔔
                    </button>

                    {/* Profil dropdown */}
                    <div style={{position: 'relative'}}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px'
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#007bff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                {user?.profil?.jmeno?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span>{user?.profil?.jmeno || 'Uživatel'}</span>
                            <span style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}>▼</span>
                        </button>

                        {showDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                minWidth: '150px',
                                zIndex: 1000,
                                transition: 'background-color 0.3s ease, border-color 0.3s ease'
                            }}>
                                <Link
                                    to="/profil"
                                    style={{
                                        display: 'block',
                                        padding: '10px 15px',
                                        textDecoration: 'none',
                                        color: 'var(--text-color)',
                                        borderBottom: '1px solid var(--card-border)',
                                        transition: 'color 0.3s ease, border-color 0.3s ease'
                                    }}
                                    onClick={() => setShowDropdown(false)}
                                >
                                    Můj profil
                                </Link>
                                <Link
                                    to="/nastaveni"
                                    style={{
                                        display: 'block',
                                        padding: '10px 15px',
                                        textDecoration: 'none',
                                        color: 'var(--text-color)',
                                        borderBottom: '1px solid var(--card-border)',
                                        transition: 'color 0.3s ease, border-color 0.3s ease'
                                    }}
                                    onClick={() => setShowDropdown(false)}
                                >
                                    Nastavení
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setShowDropdown(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 15px',
                                        background: 'none',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: '#dc3545'
                                    }}
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
