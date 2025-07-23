import React from 'react';

const Nastaveni = () => {
    return (
        <div>
            <h1>Nastavení</h1>
            <div className="card">
                <h3>Obecné nastavení</h3>
                <div className="form-group">
                    <label className="form-label">Jazyk</label>
                    <select className="form-input">
                        <option value="cs">Čeština</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" />
                        Tmavý režim
                    </label>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" defaultChecked />
                        Emailová oznámení
                    </label>
                </div>

                <button className="btn btn-primary">
                    Uložit nastavení
                </button>
            </div>

            <div className="card">
                <h3>Změna hesla</h3>
                <div className="form-group">
                    <label className="form-label">Staré heslo</label>
                    <input type="password" className="form-input" />
                </div>

                <div className="form-group">
                    <label className="form-label">Nové heslo</label>
                    <input type="password" className="form-input" />
                </div>

                <div className="form-group">
                    <label className="form-label">Potvrdit nové heslo</label>
                    <input type="password" className="form-input" />
                </div>

                <button className="btn btn-primary">
                    Změnit heslo
                </button>
            </div>
        </div>
    );
};

export default Nastaveni;
