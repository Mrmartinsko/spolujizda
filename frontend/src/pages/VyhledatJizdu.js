import React from 'react';
import RideSearch from '../components/rides/RideSearch';

const VyhledatJizdu = () => {
  return (
    <div className="page-shell">
      <section className="page-hero page-hero--light">
        <span className="page-hero__eyebrow">Vyhledávání</span>
        <h1 className="page-hero__title">Najděte spoj, který vám sedne časem i trasou</h1>
        <p className="page-hero__text">
          Vyberte odkud, kam a kdy chcete jet. Výsledky jsou řazené tak, aby byly nejdůležitější informace vidět hned.
        </p>
      </section>

      <RideSearch />
    </div>
  );
};

export default VyhledatJizdu;
