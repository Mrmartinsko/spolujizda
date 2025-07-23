import React, { useState, useEffect } from 'react';
import RideSearch from '../components/rides/RideSearch';
import RideList from '../components/rides/RideList';
import Chat from '../components/chat/Chat';
import './HomePage.css';

const HomePage = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [selectedRideId, setSelectedRideId] = useState(null);

    const handleSearchResults = (results) => {
        setSearchResults(results);
    };

    const handleRideUpdate = () => {
        // Aktualizace výsledků vyhledávání
        setSearchResults([]);
    };

    const openChat = (jizdaId) => {
        setSelectedRideId(jizdaId);
        setShowChat(true);
    };

    const closeChat = () => {
        setShowChat(false);
        setSelectedRideId(null);
    };

    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Spolujízda</h1>
                <p>Najděte spolujízdu nebo nabídněte svou cestu</p>
            </div>

            <div className="search-section">
                <RideSearch onSearchResults={handleSearchResults} />
            </div>

            {searchResults.length > 0 && (
                <div className="results-section">
                    <h2>Výsledky vyhledávání ({searchResults.length})</h2>
                    <RideList
                        rides={searchResults}
                        onRideUpdate={handleRideUpdate}
                        onChatOpen={openChat}
                    />
                </div>
            )}

            {searchResults.length === 0 && (
                <div className="welcome-info">
                    <div className="info-cards">
                        <div className="info-card">
                            <h3>🔍 Najděte jízdu</h3>
                            <p>Vyhledejte spolujízdu podle vašich potřeb. Zadejte výchozí a cílové místo.</p>
                        </div>
                        <div className="info-card">
                            <h3>🚗 Nabídněte jízdu</h3>
                            <p>Máte volné místo v autě? Nabídněte spolujízdu a ušetřete náklady na palivo.</p>
                        </div>
                        <div className="info-card">
                            <h3>💬 Komunikujte</h3>
                            <p>Využijte chat pro domluvu detailů cesty s ostatními účastníky.</p>
                        </div>
                        <div className="info-card">
                            <h3>⭐ Hodnoťte</h3>
                            <p>Hodnoťte své zkušenosti s ostatními uživateli a budujte důvěru.</p>
                        </div>
                    </div>
                </div>
            )}

            {showChat && selectedRideId && (
                <Chat jizdaId={selectedRideId} onClose={closeChat} />
            )}
        </div>
    );
};

export default HomePage;
