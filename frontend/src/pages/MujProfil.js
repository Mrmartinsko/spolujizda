import React from 'react';
import { useAuth } from '../context/AuthContext';

const MujProfil = () => {
    const { user } = useAuth();

    return (
        <div>
            <h1>Můj profil</h1>
            <div className="card">
                <h3>Základní informace</h3>
                {user?.profil ? (
                    <div>
                        <p><strong>Jméno:</strong> {user.profil.jmeno}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Bio:</strong> {user.profil.bio || 'Není vyplněno'}</p>
                        <p><strong>Hodnocení jako řidič:</strong> {user.profil.hodnoceni_ridic || 0}/5</p>
                        <p><strong>Hodnocení jako pasažér:</strong> {user.profil.hodnoceni_pasazer || 0}/5</p>
                        <p><strong>Počet aut:</strong> {user.profil.pocet_aut || 0}</p>
                    </div>
                ) : (
                    <p>Profil nenalezen</p>
                )}

                <div style={{ marginTop: '20px' }}>
                    <button className="btn btn-primary" style={{ marginRight: '10px' }}>
                        Upravit profil
                    </button>
                    <button className="btn btn-secondary">
                        Spravovat auta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MujProfil;
