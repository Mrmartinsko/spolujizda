import React, { useEffect, useState } from 'react';
import { CarFront, CirclePlus, GripVertical, MapPinned } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LocationAutocompleteInput from './LocationAutocompleteInput';
import './RideForm.css';

const CarForm = ({ token, onCarCreated, onCancel }) => {
  const [carData, setCarData] = useState({
    znacka: '',
    model: '',
    barva: '',
    spz: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCarData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedCarData = {
      znacka: (carData.znacka || '').trim(),
      model: (carData.model || '').trim(),
      barva: (carData.barva || '').trim(),
      spz: (carData.spz || '').trim(),
    };

    if (!normalizedCarData.znacka || !normalizedCarData.model) {
      setError('Znacka a model jsou povinne.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auta/moje-nove', normalizedCarData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onCarCreated(response.data.auto);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Auto se nepodarilo vytvorit.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="ride-form__car-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Pridat auto</h3>
          <p className="ui-card__subtitle">Bez auta se nabidka jízdy neobejde. Staci doplnit zakladni udaje.</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="ride-form__grid ride-form__grid--two">
        <div className="field-group">
          <label className="field-label" htmlFor="znacka">
            Znacka
          </label>
          <input id="znacka" className="ui-input" type="text" name="znacka" value={carData.znacka} onChange={handleChange} required maxLength={50} />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="model">
            Model
          </label>
          <input id="model" className="ui-input" type="text" name="model" value={carData.model} onChange={handleChange} required maxLength={50} />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="barva">
            Barva
          </label>
          <input id="barva" className="ui-input" type="text" name="barva" value={carData.barva} onChange={handleChange} maxLength={50} />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="spz">
            SPZ
          </label>
          <input id="spz" className="ui-input" type="text" name="spz" value={carData.spz} onChange={handleChange} maxLength={20} />
        </div>

        <div className="ride-form__actions">
          <Button type="submit" disabled={loading}>
            {loading ? 'Ukladam auto...' : 'Ulozit auto'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Zpet
          </Button>
        </div>
      </form>
    </Card>
  );
};

const emptyLocationMeta = {
  text: '',
  place_id: null,
  address: '',
};

const createStop = (text = '', meta = null) => ({
  text,
  place_id: meta?.place_id || null,
  address: meta?.address || '',
});

const RideForm = ({ onRideCreated }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    odkud: '',
    odkud_place_id: null,
    odkud_address: '',
    kam: '',
    kam_place_id: null,
    kam_address: '',
    casOdjezdu: '',
    casPrijezdu: '',
    cena: '',
    pocetMist: 1,
    auto_id: '',
  });
  const [auta, setAuta] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creatingCar, setCreatingCar] = useState(false);
  const [noCars, setNoCars] = useState(false);
  const [mezistanice, setMezistanice] = useState([]);
  const [novaMezistanice, setNovaMezistanice] = useState(emptyLocationMeta);

  const validateLocationField = (value, fieldLabel) => {
    const normalized = (value || '').trim();
    // Frontend kopiruje zakladni limity backendu, aby uzivatel dostal chybu co nejdriv.
    if (!normalized) return `${fieldLabel} je povinne.`;
    if (normalized.length > 100) return `${fieldLabel} muze mit maximalne 100 znaku.`;
    if (/[^\p{L}\p{N}\s-]/gu.test(normalized)) {
      return `${fieldLabel} muze obsahovat jen pismena, cisla, mezery a pomlcky.`;
    }
    return null;
  };

  useEffect(() => {
    const fetchUserCars = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auta/moje', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userCars = response.data || [];
        setAuta(userCars);

        if (userCars.length === 0) {
          setNoCars(true);
        } else {
          // Kdyz auto existuje, predvyplnime primarni volbu a formular muze zustat jednou obrazovkou.
          setFormData((prev) => ({
            ...prev,
            auto_id: userCars.find((car) => car.primarni)?.id || userCars[0].id,
          }));
          setNoCars(false);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Auta se nepodarilo nacist.'));
      }
    };

    fetchUserCars();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (fieldName, value, meta) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
      [`${fieldName}_place_id`]: meta?.place_id || null,
      [`${fieldName}_address`]: meta?.address || '',
    }));
  };

  const handleNovaMezistaniceChange = (_, value, meta) => {
    setNovaMezistanice(createStop(value, meta));
  };

  const pridatMezistanici = () => {
    const value = novaMezistanice.text.trim();
    if (!value) return;

    const locationError = validateLocationField(value, 'Mezistanice');
    if (locationError) {
      setError(locationError);
      return;
    }

    // Duplicity hlidame podle place_id, jinak aspon podle textu pro rucne zadane zastavky.
    const exists = mezistanice.some((m) =>
      m.place_id && novaMezistanice.place_id
        ? m.place_id === novaMezistanice.place_id
        : m.text.toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      setNovaMezistanice(emptyLocationMeta);
      return;
    }

    setMezistanice((prev) => [...prev, createStop(value, novaMezistanice)]);
    setNovaMezistanice(emptyLocationMeta);
    setError('');
  };

  const smazatMezistanici = (index) => {
    setMezistanice((prev) => prev.filter((_, i) => i !== index));
  };

  const posunNahoru = (index) => {
    if (index === 0) return;
    setMezistanice((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const posunDolu = (index) => {
    setMezistanice((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const resetForm = () => {
    // Po uspesnem vytvoreni nechavame predvybrane primarni auto, aby slo rychle zalozit dalsi jizdu.
    setFormData({
      odkud: '',
      odkud_place_id: null,
      odkud_address: '',
      kam: '',
      kam_place_id: null,
      kam_address: '',
      casOdjezdu: '',
      casPrijezdu: '',
      cena: '',
      pocetMist: 1,
      auto_id: auta.find((car) => car.primarni)?.id || auta[0]?.id || '',
    });
    setMezistanice([]);
    setNovaMezistanice(emptyLocationMeta);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Datumy validujeme i na klientu, aby uzivatel nemusel cekat na backend odpoved kvuli zjevne chybe.
    const odkud = formData.odkud.trim();
    const kam = formData.kam.trim();
    const departureDate = formData.casOdjezdu ? new Date(formData.casOdjezdu) : null;
    const arrivalDate = formData.casPrijezdu ? new Date(formData.casPrijezdu) : null;
    const cena = Number(formData.cena);
    const pocetMist = Number(formData.pocetMist);

    const odkudError = validateLocationField(odkud, 'Odkud');
    if (odkudError) {
      setError(odkudError);
      return;
    }

    const kamError = validateLocationField(kam, 'Kam');
    if (kamError) {
      setError(kamError);
      return;
    }

    for (const stop of mezistanice) {
      const stopError = validateLocationField(stop.text, 'Mezistanice');
      if (stopError) {
        setError(stopError);
        return;
      }
    }

    if (!formData.auto_id) {
      setError('Vyberte auto pro jízdu.');
      return;
    }

    if (!departureDate || Number.isNaN(departureDate.getTime())) {
      setError('Zadejte platny cas odjezdu.');
      return;
    }

    if (!arrivalDate || Number.isNaN(arrivalDate.getTime())) {
      setError('Zadejte platny cas prijezdu.');
      return;
    }

    if (departureDate <= new Date()) {
      setError('Odjezd musi byt v budoucnu.');
      return;
    }

    if (arrivalDate <= departureDate) {
      setError('Prijezd musi byt po odjezdu.');
      return;
    }

    if (Number.isNaN(cena) || cena < 0) {
      setError('Cena musi byt kladne cislo nebo nula.');
      return;
    }

    if (!Number.isInteger(pocetMist) || pocetMist <= 0) {
      setError('Pocet mist musi byt cele cislo vetsi nez 0.');
      return;
    }

    setLoading(true);

    const payload = {
      auto_id: formData.auto_id,
      odkud,
      odkud_place_id: formData.odkud_place_id,
      odkud_address: formData.odkud_address,
      kam,
      kam_place_id: formData.kam_place_id,
      kam_address: formData.kam_address,
      mezistanice: mezistanice.map((stop) => ({
        text: stop.text.trim(),
        place_id: stop.place_id,
        address: stop.address,
      })),
      cas_odjezdu: formData.casOdjezdu,
      cas_prijezdu: formData.casPrijezdu,
      cena,
      pocet_mist: pocetMist,
    };

    // Prazdne mezistanice neposilame, backend pak dostane jednodussi a konzistentni payload.
    if (payload.mezistanice.length === 0) {
      delete payload.mezistanice;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/jizdy/', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (onRideCreated) onRideCreated(response.data);
      resetForm();
      setSuccess('Jízda byla uspesne pridana.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Jízdu se nepodarilo vytvorit.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="ride-form">
      <div className="ui-card__header ride-form__header">
        <div>
          <h2 className="ui-card__title">Detaily jízdy</h2>
          <p className="ui-card__subtitle">Vyplnte jen to podstatne. Nepodstatne interni detaily nechavame stranou.</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {noCars && !creatingCar && (
        <div className="empty-state ride-form__empty">
          <div className="ride-form__empty-icon">
            <CarFront size={24} />
          </div>
          <div>
            <h3 className="empty-state__title">Nejdriv potrebujete pridat auto</h3>
            <p className="empty-state__text">
              Jakmile bude auto v garazi, pujde ho vybrat i pro nove jízdy. Staci ho pridat jednou.
            </p>
          </div>
          <Button type="button" onClick={() => setCreatingCar(true)}>
            <CirclePlus size={16} />
            Pridat auto
          </Button>
        </div>
      )}

      {creatingCar && (
        <CarForm
          token={token}
          onCarCreated={(newCar) => {
            setAuta((prev) => [...prev, newCar]);
            setFormData((prev) => ({ ...prev, auto_id: newCar.id }));
            setCreatingCar(false);
            setNoCars(false);
          }}
          onCancel={() => setCreatingCar(false)}
        />
      )}

      {!creatingCar && (
        <form onSubmit={handleSubmit} className="ride-form__layout">
          <div className="ride-form__grid ride-form__grid--two">
            <LocationAutocompleteInput
              label="Odkud"
              name="odkud"
              value={formData.odkud}
              onChange={handleLocationChange}
              required
              placeholder="Výchozí město"
            />

            <LocationAutocompleteInput
              label="Kam"
              name="kam"
              value={formData.kam}
              onChange={handleLocationChange}
              required
              placeholder="Cílové město"
            />
          </div>

          <Card className="ride-form__subcard">
            <div className="ui-card__header">
              <div>
                <h3 className="ui-card__title">Mezizastávky</h3>
                <p className="ui-card__subtitle">Volitelné body na trase. Pomáhají cestujícím lépe odhadnout, kde mohou nastoupit.</p>
              </div>
            </div>

            <div className="mezistanice-row">
              <LocationAutocompleteInput
                name="novaMezistanice"
                value={novaMezistanice.text}
                onChange={handleNovaMezistaniceChange}
                hideLabel
                wrapperClassName="mezistanice-autocomplete"
                placeholder="Napriklad Jihlava"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    pridatMezistanici();
                  }
                }}
              />
              <Button type="button" variant="secondary" className="mezistanice-add" onClick={pridatMezistanici}>
                Přidat zastávku
              </Button>
            </div>

            {mezistanice.length > 0 && (
              <ul className="mezistanice-list">
                {mezistanice.map((m, i) => (
                  <li key={`${m.place_id || m.text}-${i}`} className="mezistanice-item">
                    <div className="mezistanice-item__main">
                      <span className="mezistanice-index">{i + 1}</span>
                      <span className="mezistanice-text">
                        <MapPinned size={16} />
                        {m.text}
                      </span>
                    </div>
                    <div className="mezistanice-actions">
                      <Button type="button" variant="secondary" size="sm" onClick={() => posunNahoru(i)} disabled={i === 0}>
                        <GripVertical size={15} />
                        Nahoru
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => posunDolu(i)}
                        disabled={i === mezistanice.length - 1}
                      >
                        Dolu
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => smazatMezistanici(i)}>
                        Odebrat
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="ride-form__grid ride-form__grid--three">
            <div className="field-group">
              <label className="field-label" htmlFor="casOdjezdu">
                Čas odjezdu
              </label>
              <input id="casOdjezdu" className="ui-input" type="datetime-local" name="casOdjezdu" value={formData.casOdjezdu} onChange={handleChange} required />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="casPrijezdu">
                Čas příjezdu
              </label>
              <input id="casPrijezdu" className="ui-input" type="datetime-local" name="casPrijezdu" value={formData.casPrijezdu} onChange={handleChange} required />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="cena">
                Cena za místo
              </label>
              <input id="cena" className="ui-input" type="number" name="cena" value={formData.cena} onChange={handleChange} required min="0" step="10" />
            </div>
          </div>

          <div className="ride-form__grid ride-form__grid--two">
            <div className="field-group">
              <label className="field-label" htmlFor="pocetMist">
                Volna mista
              </label>
              <input id="pocetMist" className="ui-input" type="number" name="pocetMist" value={formData.pocetMist} onChange={handleChange} required min="1" max="8" />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="auto_id">
                Auto
              </label>
              <select id="auto_id" className="ui-input" name="auto_id" value={formData.auto_id} onChange={handleChange} required>
                <option value="">Vyberte auto</option>
                {auta.map((auto) => (
                  <option key={auto.id} value={auto.id}>
                    {auto.znacka} {auto.model} {auto.spz ? `(${auto.spz})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ride-form__footer">
            <p className="field-hint">Po vytvoření jízdy se rezervace i změny budou dál spravovat z přehledu Moje jízdy.</p>
            <Button type="submit" disabled={loading}>
              {loading ? 'Vytvarim jizdu...' : 'Nabídnout jízdu'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default RideForm;
