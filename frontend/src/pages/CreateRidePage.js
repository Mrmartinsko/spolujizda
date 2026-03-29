import React from 'react';
import { CarFront, Coins, MapPinned, MessageSquareText } from 'lucide-react';
import RideForm from '../components/rides/RideForm';
import Card from '../components/ui/Card';
import './CreateRidePage.css';

const tips = [
  {
    icon: MapPinned,
    title: 'Plánujte s předstihem',
    text: 'Když jízdu zveřejníte dřív, cestující mají víc času zareagovat a domluvit se.',
  },
  {
    icon: Coins,
    title: 'Nastavte férovou cenu',
    text: 'Jednoduchá, srozumitelná cena působí lépe než složité dopočítávání na poslední chvíli.',
  },
  {
    icon: MessageSquareText,
    title: 'Buďte v kontaktu',
    text: 'Krátká zpráva při změně času nebo trasy pomůže předejít zmatkům.',
  },
  {
    icon: CarFront,
    title: 'Myslete na pohodlí',
    text: 'Přehledně popsané auto i počet míst dávají ostatním jistotu ještě před rezervací.',
  },
];

const CreateRidePage = () => {
  const handleRideCreated = (newRide) => {
    console.log('Nová jízda vytvořena:', newRide);
  };

  return (
    <div className="page-shell create-ride-page">
      <section className="page-hero">
        <span className="page-hero__eyebrow">Nabídka jízdy</span>
        <h1 className="page-hero__title">Sdílejte cestu, ne starosti s dopravou</h1>
        <p className="page-hero__text">
          Přidejte trasu, čas a auto. Všechno ostatní už pak zvládnete pohodlně spravovat z přehledu jízd.
        </p>
      </section>

      <div className="form-container">
        <RideForm onRideCreated={handleRideCreated} />
      </div>

      <section className="page-section">
        <div className="section-heading">
          <h2>Tipy pro lepší nabídku</h2>
        </div>

        <div className="tips-grid">
          {tips.map(({ icon: Icon, title, text }) => (
            <Card key={title} interactive className="tip-card">
              <div className="tip-card__icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CreateRidePage;
