import React, { useState } from 'react';
import RideSearch from '../components/rides/RideSearch';
import RideList from '../components/rides/RideList';

const VyhledatJizdu = () => {
    return (
        <div className="search-page">
            <h1>Vyhledat jízdu</h1>
            <div className="search-section">
                <RideSearch />
            </div>
        </div>
    );
};
export default VyhledatJizdu;
