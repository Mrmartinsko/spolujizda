import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, SendHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PersonalChat.css';

const resolveUsername = (participant) => {
  if (!participant) return '';
  return participant.username || participant.jmeno || participant.profil?.jmeno || '';
};

const BOTTOM_THRESHOLD = 72;

const PersonalChat = ({ otherUserId, onClose, isInline = false }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState(null);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [error, setError] = useState('');

  const requestRef = useRef(0);
  const messagesViewportRef = useRef(null);
  const initialPositionedRef = useRef(false);
  const lastKnownNearBottomRef = useRef(true);
  const pendingScrollBehaviorRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const navigate = useNavigate();

  const isNearBottom = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return true;
    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM_THRESHOLD;
  };

  const scrollToBottom = (behavior = 'auto') => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  const fetchChat = async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      setError('');
      initialPositionedRef.current = false;
      lastKnownNearBottomRef.current = true;
      pendingScrollBehaviorRef.current = 'auto';
      previousMessageCountRef.current = 0;

      const response = await api.get(`/chat/osobni/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (requestRef.current !== requestId) return;

      setChatData(response.data.chat);
      setMessages(response.data.zpravy || []);

      const druhyUzivatel = response.data.chat.ucastnici?.find((ucastnik) => ucastnik.id !== user.id);
      setOtherUserName(resolveUsername(druhyUzivatel) || `Uživatel #${otherUserId}`);
    } catch (requestError) {
      if (requestRef.current !== requestId) return;
      console.error('Chyba při načítání chatu:', requestError);
      setError('Chat se nepodařilo načíst.');
      setChatData(null);
      setMessages([]);
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!otherUserId) {
      setError('Chat se nepodařilo otevřít.');
      setLoading(false);
      return;
    }

    fetchChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, token]);

  useLayoutEffect(() => {
    if (loading) return;

    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    const previousCount = previousMessageCountRef.current;
    const hasNewMessages = messages.length > previousCount;

    if (!initialPositionedRef.current) {
      scrollToBottom('auto');
      initialPositionedRef.current = true;
      lastKnownNearBottomRef.current = true;
      pendingScrollBehaviorRef.current = null;
      previousMessageCountRef.current = messages.length;
      return;
    }

    if (pendingScrollBehaviorRef.current) {
      scrollToBottom(pendingScrollBehaviorRef.current);
      pendingScrollBehaviorRef.current = null;
      lastKnownNearBottomRef.current = true;
      previousMessageCountRef.current = messages.length;
      return;
    }

    if (hasNewMessages && lastKnownNearBottomRef.current) {
      scrollToBottom('smooth');
      lastKnownNearBottomRef.current = true;
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, loading]);

  const handleMessagesScroll = () => {
    lastKnownNearBottomRef.current = isNearBottom();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !chatData?.id) return;

    try {
      setSending(true);
      pendingScrollBehaviorRef.current = 'smooth';

      const response = await api.post(
        `/chat/${chatData.id}/zpravy`,
        { text: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [...prev, response.data.zprava]);
      setNewMessage('');
      setError('');
    } catch (requestError) {
      console.error('Chyba při odesílání zprávy:', requestError);
      setError('Zprávu se nepodařilo odeslat.');
      pendingScrollBehaviorRef.current = null;
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className={isInline ? 'personal-chat-inline' : 'personal-chat-overlay'}>
        <div className="personal-chat-container">
          <div className="chat-loading">
            <div className="chat-loading__spinner" />
            <div>
              <strong>Načítám konverzaci...</strong>
              <p>Chvíli strpení, připravuji zprávy.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isInline ? 'personal-chat-inline' : 'personal-chat-overlay'}>
      <div className="personal-chat-container">
        <div className="chat-header">
          <div className="chat-title">
            <h3>{otherUserName}</h3>
          </div>
          {!isInline && (
            <button
              className="close-button"
              onClick={() => (onClose ? onClose() : navigate('/moje-chaty'))}
              type="button"
            >
              <ArrowLeft size={16} />
              <span>Zpět</span>
            </button>
          )}
        </div>

        {error && <div className="chat-feedback chat-feedback--error">{error}</div>}

        <div className="chat-messages" ref={messagesViewportRef} onScroll={handleMessagesScroll}>
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>Zatím tu nejsou žádné zprávy. Klidně začněte krátkou praktickou domluvou.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.odesilatel_id === user?.id ? 'my-message' : 'other-message'}`}
              >
                <div className="message-content">
                  {message.odesilatel_id !== user?.id && (
                    <div className="message-sender">
                      {resolveUsername(message.odesilatel) || otherUserName}
                    </div>
                  )}
                  <p>{message.text}</p>
                  <small className="message-time">{formatTime(message.cas)}</small>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="chat-input" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište zprávu..."
            disabled={sending}
            maxLength={500}
          />
          <button type="submit" disabled={!newMessage.trim() || sending} className="send-button">
            <SendHorizontal size={17} />
            <span>{sending ? 'Odesílám' : 'Odeslat'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default PersonalChat;
