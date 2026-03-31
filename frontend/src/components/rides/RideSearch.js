import React, { useState } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { getApiErrorMessage } from '../../utils/apiError';
import LocationAutocompleteInput from './LocationAutocompleteInput';
import RideList from './RideList';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Card from '../ui/Card';
import './RideSearch.css';

const RideSearch = ({ onSearchResults }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchData, setSearchData] = useState({
    odkud: '',
    odkud_place_id: null,
    odkud_address: '',
    kam: '',
    kam_place_id: null,
    kam_address: '',
    datum: '',
    pocet_pasazeru: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({
      ...prev,
      [name]: name === 'pocet_pasazeru' ? Number(value) : value,
    }));
  };

  const handleLocationChange = (fieldName, value, meta) => {
    setSearchData((prev) => ({
      ...prev,
      [fieldName]: value,
      [`${fieldName}_place_id`]: meta?.place_id || null,
      [`${fieldName}_address`]: meta?.address || '',
    }));
  };

  const runSearch = async () => {
    const odkud = (searchData.odkud || '').trim();
    const kam = (searchData.kam || '').trim();
    const pocetPasazeru = Number(searchData.pocet_pasazeru);

    // Zakladni kombinace trasy, data a poctu mist je povinna, jinak by backend vracel moc siroke vysledky.
    if (!odkud || !kam || !searchData.datum) {
      setError('Vyplnte odkud, kam a datum odjezdu.');
      setHasSearched(true);
      setSearchResults([]);
      return;
    }

    if (!Number.isInteger(pocetPasazeru) || pocetPasazeru <= 0) {
      setError('Zadejte platny pocet mist.');
      setHasSearched(true);
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setError('');

    try {
      const response = await axios.get('http://localhost:5000/api/jizdy/vyhledat', {
        params: {
          odkud,
          odkud_place_id: searchData.odkud_place_id,
          kam,
          kam_place_id: searchData.kam_place_id,
          datum: searchData.datum,
          pocet_pasazeru: pocetPasazeru,
        },
      });

      const data = Array.isArray(response.data) ? response.data : [];
      // Backend vraci i typ shody, ktery si nechavame pro pripadne odliseni full a partial match.
      const fetchedRides = data.map((item) => ({
        ...item.ride,
        match_type: item.match_type,
      }));

      const now = new Date();
      // Jde o obranny filtr pro pripad, ze backend vrati uz neaktualni zaznam tesne po odjezdu.
      const aktualniJizdy = fetchedRides.filter((ride) => new Date(ride.cas_odjezdu) > now);

      setSearchResults(aktualniJizdy);
      if (onSearchResults) onSearchResults(aktualniJizdy);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Vyhledavani jízd se nepovedlo.'));
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runSearch();
  };

  return (
    <div className="ride-search">
      <Card className="ride-search__card">
        <div className="ui-card__header">
          <div>
            <h2 className="ui-card__title">Najít vhodnou jízdu</h2>
            <p className="ui-card__subtitle">Vyberte trasu, datum a počet míst. O zbytek se postará aplikace.</p>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="ride-search__form">
          <div className="search-fields">
            <LocationAutocompleteInput
              label="Odkud"
              name="odkud"
              value={searchData.odkud}
              onChange={handleLocationChange}
              placeholder="Například Brno"
            />

            <LocationAutocompleteInput
              label="Kam"
              name="kam"
              value={searchData.kam}
              onChange={handleLocationChange}
              placeholder="Například Praha"
            />

            <div className="field-group">
              <label className="field-label" htmlFor="datum">
                Datum
              </label>
              <input id="datum" className="ui-input" type="date" name="datum" value={searchData.datum} onChange={handleChange} />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="pocet_pasazeru">
                Počet míst
              </label>
              <input
                id="pocet_pasazeru"
                className="ui-input"
                type="number"
                name="pocet_pasazeru"
                value={searchData.pocet_pasazeru}
                onChange={handleChange}
                min="1"
                max="8"
              />
            </div>

            <Button type="submit" className="ride-search__submit" disabled={loading}>
              <Search size={16} />
              {loading ? 'Hledam...' : 'Vyhledat'}
            </Button>
          </div>
        </form>
      </Card>

      {hasSearched && (
        <div className="results-section">
          <div className="section-heading">
            <div>
              <h2>Vysledky vyhledavani</h2>
              <p className="ride-search__results-copy">{searchResults.length} odpovidajicich jízd</p>
            </div>
          </div>

          {loading ? (
            <Card className="no-results">Nacitam vysledky...</Card>
          ) : searchResults.length > 0 ? (
            <RideList
              rides={searchResults}
              onRideUpdate={runSearch}
              defaultReservationMist={searchData.pocet_pasazeru}
            />
          ) : (
            <Card className="no-results">
              Zadna vhodna jízda se ted nenasla. Zkuste jiny cas, trasu nebo nabidnete vlastni spoj.
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default RideSearch;
