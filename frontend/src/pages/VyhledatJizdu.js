import React, { useState } from 'react';
import RideSearch from '../components/rides/RideSearch';
import RideList from '../components/rides/RideList';

const VyhledatJizdu = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearchResults = (results) => {
        setSearchResults(results);
        setHasSearched(true);
    };

    const handleRideUpdate = () => {
        setSearchResults([]); // volitelné, můžeš upravit podle potřeby
    };

    return (
        <div className="search-page">
            <h1>Vyhledat jízdu</h1>
            
            <div className="search-section">
                <RideSearch onSearchResults={handleSearchResults} />
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
        </div>
    );
};

export default VyhledatJizdu;
