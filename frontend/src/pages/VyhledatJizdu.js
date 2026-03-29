import React from 'react';
import RideSearch from '../components/rides/RideSearch';

const VyhledatJizdu = () => {
  return (
    <div className="page-shell">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">Vyhledávání</span>
        <h1 className="page-hero__title">Vyhledat jízdu</h1>
        <p className="page-hero__text">
          Vyberte odkud, kam a kdy chcete jet. Výsledky ukážou jen to nejdůležitější.
        </p>
      </section>

      <RideSearch />
    </div>
  );
};

export default VyhledatJizdu;
