import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import Alert from '../ui/Alert';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ReplaceCar from './ReplaceCar';
import ConfirmModal from '../common/ConfirmModal';
import './CarManager.css';

const initialFormData = {
  znacka: '',
  model: '',
  barva: '',
  spz: '',
  primarni: false,
};

const CarManager = () => {
  const { token } = useAuth();
  const [auta, setAuta] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReplaceCar, setShowReplaceCar] = useState({ active: false, autoId: null, aktivniJizdyCount: 0 });
  const [deleteModal, setDeleteModal] = useState({ open: false, autoId: null });

  const fetchAuta = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auta/moje', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuta(response.data);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Auta se nepodarilo nacist.'));
    }
  };

  useEffect(() => {
    fetchAuta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedFormData = {
      ...formData,
      znacka: (formData.znacka || '').trim(),
      model: (formData.model || '').trim(),
      barva: (formData.barva || '').trim(),
      spz: (formData.spz || '').trim(),
    };

    if (!normalizedFormData.znacka || !normalizedFormData.model) {
      setError('Znacka a model jsou povinne.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editing) {
        await axios.put(`http://localhost:5000/api/auta/${editing}`, normalizedFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('http://localhost:5000/api/auta/moje-nove', normalizedFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setFormData(initialFormData);
      setEditing(null);
      fetchAuta();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Auto se nepodarilo ulozit.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (auto) => {
    setFormData({
      znacka: auto.znacka,
      model: auto.model,
      barva: auto.barva,
      spz: auto.spz,
      primarni: auto.primarni,
    });
    setEditing(auto.id);
    setError('');
  };

  const executeDelete = async (autoId) => {
    try {
      await axios.delete(`http://localhost:5000/api/auta/${autoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAuta();
    } catch (err) {
      const errorMessage = err.response?.data?.error || '';
      const hasActiveRidesConflict =
        err.response?.status === 409 &&
        typeof errorMessage === 'string' &&
        errorMessage.toLowerCase().includes('aktivn');

      if (hasActiveRidesConflict) {
        setShowReplaceCar({
          active: true,
          autoId,
          aktivniJizdyCount: err.response?.data?.pocet_aktivnich_jizd || 0,
        });
      } else {
        setError(getApiErrorMessage(err, 'Auto se nepodarilo smazat.'));
      }
    }
  };

  const cancelEdit = () => {
    setFormData(initialFormData);
    setEditing(null);
    setError('');
  };

  return (
    <div className="page-shell car-manager">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">Garaz</span>
        <h1 className="page-hero__title">Sprava aut na jednom miste</h1>
        <p className="page-hero__text">
          Vyberte si primarni auto, upravte detaily nebo pridejte dalsi vuz pro jiny typ cesty.
        </p>
      </section>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid-2">
        <Card>
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">Moje auta</h2>
              <p className="ui-card__subtitle">Primarni auto bude predvyplnene pri tvorbe jizdy.</p>
            </div>
            <Badge variant="primary">{auta.length} vozu</Badge>
          </div>

          {auta.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state__title">Zatim tu neni zadne auto</h3>
              <p className="empty-state__text">Pridejte prvni vuz a nabidka jizd bude pripravena hned na dalsi krok.</p>
            </div>
          ) : (
            <div className="cars-grid">
              {auta.map((auto) => (
                <Card key={auto.id} interactive className="car-card">
                  <div className="car-header">
                    <div>
                      <h3>{auto.znacka} {auto.model}</h3>
                      <p>{auto.barva || 'Barva neuvedena'}{auto.spz ? ` - ${auto.spz}` : ''}</p>
                    </div>
                    {auto.primarni && <Badge variant="success">Primarni</Badge>}
                  </div>

                  <div className="car-actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleEdit(auto)}>
                      Upravit
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => setDeleteModal({ open: true, autoId: auto.id })}>
                      Smazat
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">{editing ? 'Upravit auto' : 'Pridat nove auto'}</h2>
              <p className="ui-card__subtitle">Drzime jednoduchy formular, aby bylo auto pripravene behem chvilky.</p>
            </div>
            {!editing && (
              <Badge variant="neutral">
                <PlusCircle size={14} />
                Novy zaznam
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field-group">
                <label className="field-label" htmlFor="znacka">
                  Znacka
                </label>
                <input id="znacka" className="ui-input" type="text" name="znacka" value={formData.znacka} onChange={handleChange} required maxLength={50} />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="model">
                  Model
                </label>
                <input id="model" className="ui-input" type="text" name="model" value={formData.model} onChange={handleChange} required maxLength={50} />
              </div>
            </div>

            <div className="form-row">
              <div className="field-group">
                <label className="field-label" htmlFor="barva">
                  Barva
                </label>
                <input id="barva" className="ui-input" type="text" name="barva" value={formData.barva} onChange={handleChange} maxLength={50} />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="spz">
                  SPZ
                </label>
                <input id="spz" className="ui-input" type="text" name="spz" value={formData.spz} onChange={handleChange} maxLength={20} placeholder="Napriklad 1A2 3456" />
              </div>
            </div>

            <label className="checkbox-row">
              <input type="checkbox" name="primarni" checked={formData.primarni} onChange={handleChange} />
              Nastavit jako primarni auto
            </label>

            <div className="form-actions">
              <Button type="submit" disabled={loading}>
                {loading ? 'Ukladam...' : editing ? 'Ulozit zmeny' : 'Pridat auto'}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={cancelEdit} disabled={loading}>
                  Zrusit upravy
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {showReplaceCar.active && (
        <ReplaceCar
          autoId={showReplaceCar.autoId}
          aktivniJizdyCount={showReplaceCar.aktivniJizdyCount}
          onClose={() => setShowReplaceCar({ active: false, autoId: null, aktivniJizdyCount: 0 })}
          onCarReplaced={() => {
            setShowReplaceCar({ active: false, autoId: null, aktivniJizdyCount: 0 });
            fetchAuta();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Smazat auto"
        message="Opravdu chcete smazat toto auto?"
        confirmText="Smazat auto"
        danger
        onCancel={() => setDeleteModal({ open: false, autoId: null })}
        onConfirm={() => {
          const autoId = deleteModal.autoId;
          setDeleteModal({ open: false, autoId: null });
          if (autoId) executeDelete(autoId);
        }}
      />
    </div>
  );
};

export default CarManager;
