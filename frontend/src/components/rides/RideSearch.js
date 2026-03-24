import React, { useState } from 'react';
import axios from 'axios';
import LocationAutocompleteInput from './LocationAutocompleteInput';
import RideList from './RideList';
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
        setSearchData(prev => ({
            ...prev,
            [name]: name === 'pocet_pasazeru' ? Number(value) : value
        }));
    };

    const handleLocationChange = (fieldName, value, meta) => {
        setSearchData(prev => ({
            ...prev,
            [fieldName]: value,
            [`${fieldName}_place_id`]: meta?.place_id || null,
            [`${fieldName}_address`]: meta?.address || '',
        }));
    };

    const runSearch = async () => {
        if (!searchData.odkud || !searchData.kam || !searchData.datum) {
            setError('Vyplnte prosim vsechna pole: odkud, kam a datum.');
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
                    odkud: searchData.odkud,
                    odkud_place_id: searchData.odkud_place_id,
                    kam: searchData.kam,
                    kam_place_id: searchData.kam_place_id,
                    datum: searchData.datum,
                    pocet_pasazeru: searchData.pocet_pasazeru,
                }
            });

            const data = Array.isArray(response.data) ? response.data : [];
            const fetchedRides = data.map(item => ({
                ...item.ride,
                match_type: item.match_type,
            }));

            const now = new Date();
            const aktualniJizdy = fetchedRides.filter(ride => new Date(ride.cas_odjezdu) > now);

            setSearchResults(aktualniJizdy);
            if (onSearchResults) {
                onSearchResults(aktualniJizdy);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba pri vyhledavani jizd');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await runSearch();
    };

    const handleRideUpdate = async () => {
        await runSearch();
    };

    return (
        <div className="ride-search">
            <h2>Vyhledat jizdu</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="search-fields">
                    <LocationAutocompleteInput
                        label="Odkud:"
                        name="odkud"
                        value={searchData.odkud}
                        onChange={handleLocationChange}
                        placeholder="Vychozi mesto"
                    />

                    <LocationAutocompleteInput
                        label="Kam:"
                        name="kam"
                        value={searchData.kam}
                        onChange={handleLocationChange}
                        placeholder="Cilove mesto"
                    />

                    <div className="form-group">
                        <label>Datum:</label>
                        <input
                            type="date"
                            name="datum"
                            value={searchData.datum}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Pocet mist:</label>
                        <input
                            type="number"
                            name="pocet_pasazeru"
                            value={searchData.pocet_pasazeru}
                            onChange={handleChange}
                            min="1"
                            max="8"
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Hledam...' : 'Vyhledat'}
                    </button>
                </div>
            </form>

            {hasSearched && (
                <div className="results-section">
                    <h2>Vysledky vyhledavani ({searchResults.length})</h2>

                    {loading ? (
                        <div className="no-results">
                            <p>Nacitam...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <RideList rides={searchResults} onRideUpdate={handleRideUpdate} />
                    ) : (
                        <div className="no-results">
                            <p>Zadne jizdy nebyly nalezeny. Zkuste zmenit parametry vyhledavani.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RideSearch;
