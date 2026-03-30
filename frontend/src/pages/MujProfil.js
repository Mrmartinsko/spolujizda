import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
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
  const [hodRidic, setHodRidic] = useState({ statistiky: { celkem: 0, prumer: 0 } });
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
        const response = await axios.get(`http://localhost:5000/api/hodnoceni/uzivatel/${user.id}?role=ridic`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHodRidic(response.data);
      } catch (requestError) {
        console.error('Chyba při načítání hodnocení:', requestError);
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
    if (!trimmedJmeno) {
      setError('Uživatelské jméno je povinné.');
      return;
    }
    if (trimmedJmeno.length > 20) {
      setError('Uživatelské jméno může mít maximálně 20 znaků.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/uzivatele/profil',
        { ...formData, jmeno: trimmedJmeno },
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
      console.error('Chyba při aktualizaci profilu:', saveError);
      setError(saveError.response?.data?.error || 'Profil se nepodařilo uložit.');
    } finally {
      setLoading(false);
    }
  };

  const prumerRidic = hodRidic?.statistiky?.prumer || 0;
  const celkemRidic = hodRidic?.statistiky?.celkem || 0;

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
                    <input className="ui-input" type="text" id="jmeno" name="jmeno" value={formData.jmeno} onChange={handleInputChange} maxLength={20} />
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
                    <textarea className="ui-input" id="bio" name="bio" value={formData.bio} onChange={handleInputChange} rows="4" placeholder="Napište krátce něco o sobě…" />
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
                    <span>{user.profil.bio || 'Zatím bez doplněného bio.'}</span>
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

        {editMode && (
          <div className="muj-profil-actions">
            <Button type="button" onClick={handleSaveChanges} disabled={loading}>
              {loading ? 'Ukládám…' : 'Uložit změny'}
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
