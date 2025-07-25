import React, { useState } from 'react';
import axios from 'axios';
import './RideSearch.css';
import RideList from './RideList';

const RideSearch = ({ onSearchResults }) => {
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [searchData, setSearchData] = useState({
        odkud: '',
        kam: '',
        datum: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setSearchData({
            ...searchData,
            [e.target.name]: e.target.value
        });
    };


    const handleRideUpdate = () => {
        setSearchResults([]); // volitelné, můžeš upravit podle potřeby
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!searchData.odkud || !searchData.kam || !searchData.datum) {
            setError('Vyplňte prosím všechna pole: odkud, kam a datum.');
            return;
        }
        setLoading(true);
        setHasSearched(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (searchData.odkud) params.append('odkud', searchData.odkud);
            if (searchData.kam) params.append('kam', searchData.kam);
            if (searchData.datum) params.append('datum', searchData.datum);

            console.log(params.toString());

            const response = await axios.get(`http://localhost:5000/api/jizdy/vyhledat?${params}`);

            console.log(response.data);

            // Uložíme výsledky do lokálního state
            setSearchResults(response.data);

            if (onSearchResults) {
                onSearchResults(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vyhledávání jízd');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ride-search">
            <h2>Vyhledat jízdu</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="search-fields">
                    <div className="form-group">
                        <label>Odkud:</label>
                        <input
                            type="text"
                            name="odkud"
                            value={searchData.odkud}
                            onChange={handleChange}
                            placeholder="Výchozí místo"
                        />
                    </div>

                    <div className="form-group">
                        <label>Kam:</label>
                        <input
                            type="text"
                            name="kam"
                            value={searchData.kam}
                            onChange={handleChange}
                            placeholder="Cílové místo"
                        />
                    </div>

                    <div className="form-group">
                        <label>Datum:</label>
                        <input
                            type="date"
                            name="datum"
                            value={searchData.datum}
                            onChange={handleChange}
                        />
                    </div>

                    {searchResults.length > 0 && (
                        <div className="results-section">
                            <h2>Výsledky vyhledávání ({searchResults.length})</h2>
                            <RideList
                                rides={searchResults}
                                onRideUpdate={handleRideUpdate}
                            />
                        </div>
                    )}

                    {hasSearched && searchResults.length === 0 && (
                        <div className="no-results">
                            <p>Žádné jízdy nebyly nalezeny. Zkuste změnit parametry vyhledávání.</p>
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Hledám...' : 'Vyhledat'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RideSearch;
