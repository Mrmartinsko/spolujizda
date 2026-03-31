import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircleMore, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import PersonalChat from '../components/chat/PersonalChat';
import Alert from '../components/ui/Alert';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import './MojeOsobniChaty.css';
import { useAuth } from '../context/AuthContext';

const resolveUsername = (participant) => {
  if (!participant) return '';
  return (
    participant.username ||
    participant.jmeno ||
    participant.profil?.jmeno ||
    participant.odesilatel?.username ||
    participant.odesilatel?.jmeno ||
    ''
  );
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;
  if (isYesterday) return 'Vcera';
  return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
};

const sortChatsByLatest = (items) => {
  return [...items].sort((a, b) => {
    const aTime = a.posledni_zprava?.cas ? new Date(a.posledni_zprava.cas).getTime() : 0;
    const bTime = b.posledni_zprava?.cas ? new Date(b.posledni_zprava.cas).getTime() : 0;
    return bTime - aTime;
  });
};

const MojeOsobniChaty = () => {
  const { token, user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [chaty, setChaty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, chatId: null });

  const fetchChaty = async ({ silent = false } = {}) => {
    try {
      if (silent) setListRefreshing(true);
      else setLoading(true);

      const response = await api.get('/chat/moje', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setChaty(sortChatsByLatest(response.data.osobni_chaty || []));
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Chaty se nepodarilo nacist.'));
    } finally {
      setLoading(false);
      setListRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchChaty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedChat = useMemo(() => {
    if (!id) return null;
    return (
      chaty.find((chat) => {
        const druhyUzivatel = chat.ucastnici?.find((u) => u.id !== user?.id);
        return String(druhyUzivatel?.id) === String(id);
      }) || null
    );
  }, [chaty, id, user?.id]);

  useEffect(() => {
    if (id && !loading && !selectedChat && chaty.length > 0) {
      fetchChaty({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loading, selectedChat, chaty.length]);

  const executeDeleteChat = async (chatId) => {
    try {
      await api.delete(`/chat/osobni/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const deletedChat = chaty.find((chat) => chat.id === chatId);
      const deletedParticipantId = deletedChat?.ucastnici?.find((u) => u.id !== user.id)?.id;

      setChaty((prev) => prev.filter((c) => c.id !== chatId));
      setError('');

      if (id && String(deletedParticipantId) === String(id)) {
        navigate('/moje-chaty', { replace: true });
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Chat se nepodarilo smazat.'));
    }
  };

  if (loading) {
    return (
      <div className="chat-workspace-loading">
        <div className="chat-workspace-loading__spinner" />
        <p>Nacitam chaty...</p>
      </div>
    );
  }

  return (
    <div className="chat-workspace">
      <aside className="chat-sidebar">
        <div className="chat-sidebar__header">
          <div>
            <h1>Chaty</h1>
            <p>Posledni konverzace mate vzdy nahore.</p>
          </div>
          {listRefreshing && <span className="chat-sidebar__refresh">Aktualizuji...</span>}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {chaty.length === 0 ? (
          <div className="chat-sidebar__empty">
            Zatím tu není žádná konverzace. Jakmile si s někým napíšete, objeví se právě tady.
          </div>
        ) : (
          <div className="chat-sidebar__list">
            {chaty.map((chat) => {
              const druhyUzivatel = chat.ucastnici?.find((u) => u.id !== user.id);
              const druhyUzivatelId = druhyUzivatel?.id;
              const username = resolveUsername(druhyUzivatel) || `Uzivatel #${druhyUzivatelId}`;
              const posledniZprava = chat.posledni_zprava;
              const previewText = posledniZprava?.text || 'Zatim bez zpravy';
              const previewPrefix =
                posledniZprava?.odesilatel?.id === user.id
                  ? 'Vy: '
                  : resolveUsername(posledniZprava?.odesilatel)
                  ? `${resolveUsername(posledniZprava.odesilatel)}: `
                  : '';
              const isActive = id && String(druhyUzivatelId) === String(id);

              return (
                <div
                  key={chat.id}
                  className={`chat-list-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => navigate(`/chat/${druhyUzivatelId}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/chat/${druhyUzivatelId}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="chat-list-item__main">
                    <h3 className="chat-list-item__name">{username}</h3>
                    <p className="chat-list-item__preview">
                      {previewPrefix}
                      {previewText}
                    </p>
                  </div>

                  <div className="chat-list-item__time">
                    {posledniZprava ? formatTime(posledniZprava.cas) : ''}
                  </div>

                  <button
                    type="button"
                    className="chat-list-item__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ open: true, chatId: chat.id });
                    }}
                    title="Smazat chat"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <section className="chat-panel">
        {id ? (
          <PersonalChat otherUserId={id} isInline />
        ) : (
          <div className="chat-panel__placeholder">
            <div className="chat-panel__placeholder-icon">
              <MessageCircleMore size={24} />
            </div>
            <h2>Vyberte konverzaci</h2>
            <p>Vlevo otevrete chat a navazete tam, kde jste naposledy skoncili.</p>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Smazat chat"
        message="Opravdu chcete smazat tento chat?"
        confirmText="Smazat chat"
        danger
        onCancel={() => setDeleteModal({ open: false, chatId: null })}
        onConfirm={() => {
          const chatId = deleteModal.chatId;
          setDeleteModal({ open: false, chatId: null });
          if (chatId) executeDeleteChat(chatId);
        }}
      />
    </div>
  );
};

export default MojeOsobniChaty;
