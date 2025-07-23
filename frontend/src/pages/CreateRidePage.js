import React from 'react';
import RideForm from '../components/rides/RideForm';
import './CreateRidePage.css';

const CreateRidePage = () => {
    const handleRideCreated = (newRide) => {
        // Můžeme přesměrovat na stránku s jízdami nebo zobrazit úspěšnou zprávu
        console.log('Nová jízda vytvořena:', newRide);
    };

    return (
        <div className="create-ride-page">
            <div className="page-header">
                <h1>Nabídnout jízdu</h1>
                <p>Sdílejte svou cestu s ostatními a ušetřete náklady na palivo</p>
            </div>

            <div className="form-container">
                <RideForm onRideCreated={handleRideCreated} />
            </div>

            <div className="tips-section">
                <h2>Tipy pro úspěšnou jízdu</h2>
                <div className="tips-grid">
                    <div className="tip-card">
                        <h3>📅 Plánujte dopředu</h3>
                        <p>Nabídněte jízdu s dostatečným předstihem, aby si pasažéři mohli cestu naplánovat.</p>
                    </div>
                    <div className="tip-card">
                        <h3>💰 Férová cena</h3>
                        <p>Stanovte reálnou cenu podle vzdálenosti a nákladů na palivo.</p>
                    </div>
                    <div className="tip-card">
                        <h3>📱 Komunikujte</h3>
                        <p>Udržujte kontakt s pasažéry a informujte je o případných změnách.</p>
                    </div>
                    <div className="tip-card">
                        <h3>🚗 Připravte auto</h3>
                        <p>Zkontrolujte stav vozidla a zajistěte dostatek místa pro pasažéry.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRidePage;
