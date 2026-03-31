import React from 'react';
import { CarFront, Coins, MapPinned, MessageSquareText } from 'lucide-react';
import RideForm from '../components/rides/RideForm';
import Card from '../components/ui/Card';
import './CreateRidePage.css';

const tips = [
  {
    icon: MapPinned,
    title: 'PlĂˇnujte s pĹ™edstihem',
    text: 'KdyĹľ jĂ­zdu zveĹ™ejnĂ­te dĹ™Ă­v, cestujĂ­cĂ­ majĂ­ vĂ­c ÄŤasu zareagovat a domluvit se.',
  },
  {
    icon: Coins,
    title: 'Nastavte fĂ©rovou cenu',
    text: 'JednoduchĂˇ, srozumitelnĂˇ cena pĹŻsobĂ­ lĂ©pe neĹľ sloĹľitĂ© dopoÄŤĂ­tĂˇvĂˇnĂ­ na poslednĂ­ chvĂ­li.',
  },
  {
    icon: MessageSquareText,
    title: 'BuÄŹte v kontaktu',
    text: 'KrĂˇtkĂˇ zprĂˇva pĹ™i zmÄ›nÄ› ÄŤasu nebo trasy pomĹŻĹľe pĹ™edejĂ­t zmatkĹŻm.',
  },
  {
    icon: CarFront,
    title: 'Myslete na pohodlĂ­',
    text: 'PĹ™ehlednÄ› popsanĂ© auto i poÄŤet mĂ­st dĂˇvajĂ­ ostatnĂ­m jistotu jeĹˇtÄ› pĹ™ed rezervacĂ­.',
  },
];

const CreateRidePage = () => {
  return (
    <div className="page-shell create-ride-page">
      <section className="page-hero">
        <span className="page-hero__eyebrow">NabĂ­dka jĂ­zdy</span>
        <h1 className="page-hero__title">NabĂ­dnout jĂ­zdu</h1>
        <p className="page-hero__text">
          VyplĹte trasu, ÄŤas a auto. SprĂˇvu rezervacĂ­ pak vyĹ™eĹˇĂ­te v pĹ™ehledu jĂ­zd.
        </p>
      </section>

      <div className="form-container">
        <RideForm />
      </div>

      <section className="page-section">
        <div className="section-heading">
          <h2>Tipy pro lepĹˇĂ­ nabĂ­dku</h2>
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
