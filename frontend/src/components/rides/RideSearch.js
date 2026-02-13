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

    const runSearch = async () => {
        // Validace – nechávám jako u tebe (všechna povinná),
        // když chceš volnější vyhledávání, stačí tohle povolit.
        if (!searchData.odkud || !searchData.kam || !searchData.datum) {
            setError('Vyplňte prosím všechna pole: odkud, kam a datum.');
            setHasSearched(true);
            setSearchResults([]);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        setError('');

        try {
            // ✅ Použijeme /api/jizdy/ protože už umí filtry + mezistanice
            const response = await axios.get('http://localhost:5000/api/jizdy/', {
                params: {
                    odkud: searchData.odkud,
                    kam: searchData.kam,
                    datum: searchData.datum,
                    pocet_pasazeru: searchData.pocet_pasazeru,
                }
            });

            const fetchedRides = response.data?.jizdy || [];

            // jen aktuální jízdy (odjezd v budoucnosti)
            const now = new Date();
            const aktualniJizdy = fetchedRides.filter(ride => new Date(ride.cas_odjezdu) > now);

            // Full match vs partial match (bereme i mezistanice)
            const fullMatch = [];
            const partialMatch = [];

            const qOdkud = searchData.odkud.toLowerCase();
            const qKam = searchData.kam.toLowerCase();

            aktualniJizdy.forEach(ride => {
                const routeStops = [
                    ride.odkud,
                    ...(ride.mezistanice || []).map(m => m.misto),
                    ride.kam
                ]
                    .filter(Boolean)
                    .map(x => x.toLowerCase());

                const odkudMatch = routeStops.includes(qOdkud);
                const kamMatch = routeStops.includes(qKam);

                if (odkudMatch && kamMatch) fullMatch.push(ride);
                else partialMatch.push(ride);
            });

            const sortedRides = [...fullMatch, ...partialMatch];

            setSearchResults(sortedRides);
            if (onSearchResults) onSearchResults(sortedRides);

        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vyhledávání jízd');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await runSearch();
    };

    // ✅ Když někdo udělá rezervaci / zruší jízdu, refreshni výsledky stejným hledáním
    const handleRideUpdate = async () => {
        await runSearch();
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

                    <div className="form-group">
                        <label>Počet míst:</label>
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
                        {loading ? 'Hledám...' : 'Vyhledat'}
                    </button>
                </div>
            </form>

            {/* ✅ Výsledky jsou POD formem */}
            {hasSearched && (
                <div className="results-section">
                    <h2>Výsledky vyhledávání ({searchResults.length})</h2>

                    {loading ? (
                        <div className="no-results">
                            <p>Načítám…</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <RideList
                            rides={searchResults}
                            onRideUpdate={handleRideUpdate}
                        />
                    ) : (
                        <div className="no-results">
                            <p>Žádné jízdy nebyly nalezeny. Zkuste změnit parametry vyhledávání.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RideSearch;
