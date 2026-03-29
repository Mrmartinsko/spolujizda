import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PersonalChat from '../components/chat/PersonalChat';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import api from '../services/api';
import './ProfilUzivatele.css';

const ProfilUzivatele = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [uzivatel, setUzivatel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [hodRidic, setHodRidic] = useState({ hodnoceni: [], statistiky: { celkem: 0, prumer: 0 } });
  const [loadingHod, setLoadingHod] = useState(false);
  const [showAllRidic, setShowAllRidic] = useState(false);

  useEffect(() => {
    if (user?.id && String(user.id) === String(id)) {
      navigate('/profil', { replace: true });
    }
  }, [user?.id, id, navigate]);

  useEffect(() => {
    const fetchUzivatel = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/uzivatele/${id}`);
        setUzivatel(response.data.uzivatel);
      } catch (requestError) {
        console.error('Chyba při načítání profilu:', requestError);
        if (requestError.response?.status === 403) setError('K tomuto profilu nemáte přístup.');
        else if (requestError.response?.status === 404) setError('Profil nebyl nalezen.');
        else setError('Profil se nepodařilo načíst.');
      } finally {
        setLoading(false);
      }
    };

    fetchUzivatel();
  }, [id]);

  useEffect(() => {
    const fetchHodnoceni = async () => {
      try {
        setLoadingHod(true);
        const response = await api.get(`/hodnoceni/uzivatel/${id}?role=ridic`);
        setHodRidic(response.data);
      } catch (requestError) {
        console.error('Chyba při načítání hodnocení:', requestError);
      } finally {
        setLoadingHod(false);
      }
    };

    if (id) fetchHodnoceni();
  }, [id]);

  const renderStars = (value) => {
    const rounded = Math.round(value || 0);
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  };

  const RatingSummary = ({ title, data }) => {
    const prumer = data?.statistiky?.prumer || 0;
    const celkem = data?.statistiky?.celkem || 0;
    const empty = celkem === 0;

    return (
      <div className="user-rating-box">
        <h3>{title}</h3>
        <div className={`user-rating-box__value ${empty ? 'is-empty' : ''}`}>
          {empty ? 'Zatím bez hodnocení' : `${prumer.toFixed(1)} / 5`}
        </div>
        <div className="user-rating-box__meta">
          {empty ? 'Hodnocení se zobrazí až po dokončených jízdách.' : `${celkem} hodnocení`}
        </div>
      </div>
    );
  };

  const ReviewList = ({ title, data, showAll, onToggleAll, emptyText }) => {
    const all = data?.hodnoceni || [];
    const list = showAll ? all : all.slice(0, 4);

    return (
      <section className="user-review-section">
        <h2>
          {title}
          {loadingHod ? ' (načítám...)' : ''}
        </h2>

        {all.length === 0 ? (
          <div className="user-review-empty">{emptyText}</div>
        ) : (
          <>
            <div className="user-review-list">
              {list.map((hodnoceni) => (
                <div key={hodnoceni.id} className="user-review-card">
                  <div className="user-review-card__top">
                    <span>
                      {renderStars(hodnoceni.znamka)} ({hodnoceni.znamka}/5)
                    </span>
                    <span className="user-review-card__date">
                      {hodnoceni.datum ? new Date(hodnoceni.datum).toLocaleDateString('cs-CZ') : ''}
                    </span>
                  </div>
                  <p className="user-review-card__text">
                    {hodnoceni.komentar || 'Bez slovního komentáře.'}
                  </p>
                </div>
              ))}
            </div>

            {all.length > 4 && (
              <Button type="button" variant="ghost" size="sm" onClick={onToggleAll}>
                {showAll ? 'Skrýt další' : `Zobrazit všechna hodnocení (${all.length})`}
              </Button>
            )}
          </>
        )}
      </section>
    );
  };

  if (loading) {
    return (
      <div className="user-profile-loading">
        <p>Načítám profil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!uzivatel || !uzivatel.profil) {
    return (
      <div className="user-profile-error">
        <p>Profil nebyl nalezen.</p>
      </div>
    );
  }

  return (
    <div className="page-shell user-profile-page">
      <Card className="user-profile-card">
        <div className="user-profile-header">
          <div
            className="user-profile-avatar"
            style={uzivatel.profil.fotka ? { backgroundImage: `url(${uzivatel.profil.fotka})` } : undefined}
          >
            {!uzivatel.profil.fotka && (uzivatel.profil.jmeno?.charAt(0)?.toUpperCase() || 'U')}
          </div>

          <div className="user-profile-heading">
            <h1>{uzivatel.profil.jmeno}</h1>
            <p className="user-profile-subtext">
              {uzivatel.profil.bio
                ? 'Profil studenta v komunitě Spolujízda.'
                : 'Profil bez doplněného bio. Základní informace a hodnocení najdete níže.'}
            </p>
          </div>

          <Button type="button" onClick={() => setShowChat(true)}>
            Napsat zprávu
          </Button>
        </div>

        {uzivatel.profil.bio && <p className="user-profile-bio">{uzivatel.profil.bio}</p>}

        <div className="user-profile-ratings">
          <RatingSummary title="Hodnocení jako řidič" data={hodRidic} />
        </div>
      </Card>

      <ReviewList
        title="Recenze od pasažérů"
        data={hodRidic}
        showAll={showAllRidic}
        onToggleAll={() => setShowAllRidic((prev) => !prev)}
        emptyText="Řidičská hodnocení tu zatím nejsou. Jakmile proběhne první ohodnocená jízda, objeví se právě tady."
      />

      {showChat && (
        <PersonalChat
          otherUserId={parseInt(id, 10)}
          otherUserName={uzivatel.profil.jmeno}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default ProfilUzivatele;
