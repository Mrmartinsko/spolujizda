import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './MujProfil.css';

const MujProfil = () => {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hodRidic, setHodRidic] = useState({ hodnoceni: [], statistiky: { celkem: 0, prumer: 0 } });
  const [showAllComments, setShowAllComments] = useState(false);
  const [formData, setFormData] = useState({
    jmeno: user?.profil?.jmeno || '',
    bio: user?.profil?.bio || '',
  });

  useEffect(() => {
    setFormData({
      jmeno: user?.profil?.jmeno || '',
      bio: user?.profil?.bio || '',
    });
  }, [user]);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        if (!user?.id) return;
        const token = localStorage.getItem('token');
        // Jeden endpoint vrací jak seznam komentářů, tak agregované statistiky pro profil.
        const response = await axios.get(`http://localhost:5000/api/hodnoceni/uzivatel/${user.id}?role=ridic`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHodRidic(response.data);
      } catch {
        setHodRidic({ hodnoceni: [], statistiky: { celkem: 0, prumer: 0 } });
      }
    };

    fetchRatings();
  }, [user?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setFormData({
      jmeno: user?.profil?.jmeno || '',
      bio: user?.profil?.bio || '',
    });
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData({
      jmeno: user?.profil?.jmeno || '',
      bio: user?.profil?.bio || '',
    });
    setError('');
    setSuccess('');
  };

  const handleSaveChanges = async () => {
    const trimmedJmeno = (formData.jmeno || '').trim();
    const trimmedBio = (formData.bio || '').trim();

    if (!trimmedJmeno) {
      setError('Uživatelské jméno je povinné.');
      return;
    }

    if (trimmedJmeno.length > 50) {
      setError('Uživatelské jméno může mít maximálně 50 znaků.');
      return;
    }

    if (trimmedBio.length > 500) {
      setError('Bio může mít maximálně 500 znaků.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/uzivatele/profil',
        { ...formData, jmeno: trimmedJmeno, bio: trimmedBio },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.uzivatel) {
        setUser(response.data.uzivatel);
        setEditMode(false);
        setSuccess('Profil byl upraven.');
      }
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Profil se nepodařilo uložit.'));
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (value) => {
    // Hvězdy jsou jen vizuální zkratka ke stejnému číselně zobrazenému průměru.
    const rounded = Math.round(value || 0);
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  };

  const prumerRidic = hodRidic?.statistiky?.prumer || 0;
  const celkemRidic = hodRidic?.statistiky?.celkem || 0;
  const allComments = hodRidic?.hodnoceni || [];
  // Na profilu ukazujeme jen krátký výřez komentářů, zbytek je možné rozbalit na vyžádání.
  const visibleComments = showAllComments ? allComments : allComments.slice(0, 3);

  return (
    <div className="page-shell muj-profil-page">
      <Card className="muj-profil-card">
        <div className="muj-profil-header">
          <div>
            <h1 className="muj-profil-title">Můj profil</h1>
            <p className="muj-profil-subtitle">Základní údaje, krátké bio a přehled řidičského hodnocení.</p>
          </div>
          {!editMode && (
            <Button type="button" onClick={handleEditClick}>
              Upravit profil
            </Button>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {user?.profil ? (
          <div className="muj-profil-grid">
            <div className="muj-profil-section">
              {editMode ? (
                <>
                  <div className="field-group">
                    <label className="field-label" htmlFor="jmeno">
                      Uživatelské jméno
                    </label>
                    <input className="ui-input" type="text" id="jmeno" name="jmeno" value={formData.jmeno} onChange={handleInputChange} maxLength={50} />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="email">
                      Email
                    </label>
                    <input className="ui-input" type="email" id="email" value={user.email} disabled readOnly />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="bio">
                      Bio
                    </label>
                    <textarea className="ui-input" id="bio" name="bio" value={formData.bio} onChange={handleInputChange} rows="4" maxLength={500} placeholder="Napište krátce něco o sobě..." />
                  </div>
                </>
              ) : (
                <>
                  <div className="muj-profil-line">
                    <strong>Uživatelské jméno</strong>
                    <span>{user.profil.jmeno}</span>
                  </div>
                  <div className="muj-profil-line">
                    <strong>Email</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="muj-profil-line">
                    <strong>Bio</strong>
                    <span>{user.profil.bio || 'Zatím bez doplněného bia.'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="muj-profil-side">
              <div className="muj-rating-box">
                <h2>Hodnocení jako řidič</h2>
                <div className={`muj-rating-box__value ${celkemRidic === 0 ? 'is-empty' : ''}`}>
                  {celkemRidic > 0 ? `${prumerRidic.toFixed(1)} / 5` : 'Zatím bez hodnocení'}
                </div>
                <div className="muj-rating-box__meta">
                  {celkemRidic > 0 ? `${celkemRidic} hodnocení` : 'Hodnocení se objeví po prvních dokončených jízdách.'}
                </div>
              </div>

              <div className="muj-garage-box">
                <div>
                  <h2>Garáž</h2>
                  <p>Zde můžete spravovat vaše auta</p>
                </div>
                <Button as={Link} to="/auta" variant="secondary">
                  Otevřít garáž
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p>Profil nebyl nalezen.</p>
        )}

        <section className="muj-review-section">
          <h2 className="muj-review-title">Komentáře k hodnocení</h2>

          {allComments.length === 0 ? (
            <div className="muj-review-empty">Zatím tu nejsou žádné komentáře k hodnocení.</div>
          ) : (
            <>
              <div className="muj-review-list">
                {visibleComments.map((hodnoceni) => (
                  <div key={hodnoceni.id} className="muj-review-card">
                    <div className="muj-review-card__top">
                      <span>{renderStars(hodnoceni.znamka)} ({hodnoceni.znamka}/5)</span>
                      <span className="muj-review-card__date">
                        {hodnoceni.datum ? new Date(hodnoceni.datum).toLocaleDateString('cs-CZ') : ''}
                      </span>
                    </div>
                    <p className="muj-review-card__text">
                      {hodnoceni.komentar || 'Bez slovního komentáře.'}
                    </p>
                  </div>
                ))}
              </div>

              {allComments.length > 3 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllComments((prev) => !prev)}>
                  {showAllComments ? 'Skrýt další' : `Zobrazit všechna hodnocení (${allComments.length})`}
                </Button>
              )}
            </>
          )}
        </section>

        {editMode && (
          <div className="muj-profil-actions">
            <Button type="button" onClick={handleSaveChanges} disabled={loading}>
              {loading ? 'Ukládám...' : 'Uložit změny'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={loading}>
              Zrušit
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MujProfil;