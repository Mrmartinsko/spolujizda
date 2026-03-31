import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import ConfirmModal from '../common/ConfirmModal';
import './ReplaceCar.css';

const ReplaceCar = ({ autoId, aktivniJizdyCount = 0, onClose, onCarReplaced }) => {
  const { token } = useAuth();
  const [availableCars, setAvailableCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCar, setNewCar] = useState({ znacka: '', model: '', spz: '', barva: '' });
  const [adding, setAdding] = useState(false);
  const [cancellingRides, setCancellingRides] = useState(false);
  const [confirmCancellationChecked, setConfirmCancellationChecked] = useState(false);
  const [confirmCancelModalOpen, setConfirmCancelModalOpen] = useState(false);

  useEffect(() => {
    const fetchAvailableCars = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get('http://localhost:5000/api/auta/moje', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const filteredCars = (response.data || []).filter((auto) => auto.id !== autoId);
        setAvailableCars(filteredCars);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Chyba pri nacitani aut.'));
        setAvailableCars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableCars();
  }, [token, autoId]);

  const replaceCar = async (newAutoId) => {
    setError('');

    try {
      await axios.post(
        `http://localhost:5000/api/auta/replace/${autoId}`,
        { nove_auto_id: newAutoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onCarReplaced) onCarReplaced();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Chyba pri nahrazovani auta.'));
    }
  };

  const addNewCar = async () => {
    const normalizedCar = {
      znacka: (newCar.znacka || '').trim(),
      model: (newCar.model || '').trim(),
      spz: (newCar.spz || '').trim(),
      barva: (newCar.barva || '').trim(),
    };

    if (!normalizedCar.znacka || !normalizedCar.model) {
      setError('Znacka a model jsou povinne.');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auta/moje-nove',
        normalizedCar,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAvailableCars((prev) => [...prev, response.data.auto]);
      setNewCar({ znacka: '', model: '', spz: '', barva: '' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Chyba pri pridavani auta.'));
    } finally {
      setAdding(false);
    }
  };

  const cancelActiveRides = async () => {
    setCancellingRides(true);
    setError('');

    try {
      await axios.post(
        `http://localhost:5000/api/auta/${autoId}/zrusit-aktivni-jizdy`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onCarReplaced) onCarReplaced();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Chyba pri ruseni aktivnich jízd.'));
    } finally {
      setCancellingRides(false);
    }
  };

  return (
    <div className="replace-car-modal">
      <div className="modal-content">
        <button
          type="button"
          className="replace-car-close"
          onClick={onClose}
          aria-label="Zavřít formulář"
        >
          ×
        </button>
        <div className="replace-car-header">
          <h2>Aktivní jízdy u auta</h2>
          <p className="modal-intro">
            Auto, které chcete smazat, je navázáno na aktivní jízdy. Můžete je převést
            na jiné auto, nebo je zrušit a auto odstranit.
          </p>
          {aktivniJizdyCount > 0 && (
            <p className="modal-intro">Dotčené aktivní jízdy: {aktivniJizdyCount}</p>
          )}
        </div>

        {loading ? (
          <div className="replace-loading-state">Nacitani dostupnych aut...</div>
        ) : (
          <>
            {error && <p className="error-message">{error}</p>}

            <div className="replace-options-grid">
              <section className="replace-option-card">
                <div className="replace-option-section">
                  <div className="card-section-heading">
                    <h3>Nahradit auto u aktivních jízd</h3>
                    <p className="section-description">
                      Vyberte jiné existující auto, nebo rychle přidejte nové a použijte ho
                      místo původního.
                    </p>
                  </div>

                  <div className="card-subsection">
                    <div className="subsection-label">Dostupná auta</div>
                    <div className="available-cars">
                      {availableCars.length === 0 ? (
                        <div className="empty-state-box">
                          Žádná dostupná auta pro nahrazení.
                        </div>
                      ) : (
                        availableCars.map((auto) => (
                          <div key={auto.id} className="available-car">
                            <span>
                              {auto.znacka} {auto.model} {auto.spz ? `(${auto.spz})` : ''}
                            </span>
                            <button type="button" onClick={() => replaceCar(auto.id)}>
                              Vybrat
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="replace-divider" />

                  <div className="card-subsection">
                    <div className="subsection-label">Přidat nové auto</div>
                    <div className="new-car-form">
                      <input
                        type="text"
                        placeholder="Značka"
                        value={newCar.znacka}
                        onChange={(e) => setNewCar({ ...newCar, znacka: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Model"
                        value={newCar.model}
                        onChange={(e) => setNewCar({ ...newCar, model: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="SPZ"
                        value={newCar.spz}
                        onChange={(e) => setNewCar({ ...newCar, spz: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Barva"
                        value={newCar.barva}
                        onChange={(e) => setNewCar({ ...newCar, barva: e.target.value })}
                      />
                      <button
                        type="button"
                        className="primary-action-btn"
                        onClick={addNewCar}
                        disabled={adding}
                      >
                        {adding ? 'Přidávám...' : 'Přidat auto'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="replace-option-card replace-option-card--danger">
                <div className="replace-option-section danger-section">
                  <span className="danger-badge">Krajní možnost</span>

                  <div className="card-section-heading">
                    <h3>Zrušit aktivní jízdy a smazat auto</h3>
                  </div>

                  <div className="danger-copy">
                    <p className="danger-text">
                      Zruší se pouze aktivní jízdy navázané na toto auto.
                    </p>
                    <p className="danger-text">
                      Dokončené ani dříve zrušené jízdy se nezmění.
                    </p>
                  </div>

                  <div className="danger-note">
                    Tuto možnost použijte jen tehdy, pokud auto nechcete nahradit jiným.
                  </div>

                  <label className="danger-confirm">
                    <input
                      type="checkbox"
                      checked={confirmCancellationChecked}
                      onChange={(e) => setConfirmCancellationChecked(e.target.checked)}
                    />
                    <span>Rozumím, že se aktivní jízdy zruší.</span>
                  </label>

                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setConfirmCancelModalOpen(true)}
                    disabled={cancellingRides || !confirmCancellationChecked}
                  >
                    {cancellingRides ? 'Ruší se...' : 'Zrušit aktivní jízdy'}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        <div className="replace-car-footer">
          <button type="button" className="close-btn close-btn--secondary" onClick={onClose}>
            Zavrit
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmCancelModalOpen}
        title="Zrušit aktivní jízdy?"
        message="Opravdu chcete zrušit všechny aktivní jízdy navázané na toto auto a auto odstranit?"
        confirmText="Ano, zrušit jízdy"
        cancelText="Zpet"
        danger
        onCancel={() => setConfirmCancelModalOpen(false)}
        onConfirm={() => {
          setConfirmCancelModalOpen(false);
          cancelActiveRides();
        }}
      />
    </div>
  );
};

export default ReplaceCar;
