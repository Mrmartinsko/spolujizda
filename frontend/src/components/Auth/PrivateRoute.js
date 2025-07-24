import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    console.log("PrivateRoute file loaded");

    // Pokud se načítá stav autentizace, zobraz loading
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Načítání...</p>
            </div>
        );
    }

    // Pokud není uživatel přihlášen, přesměruj na login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Pokud je uživatel přihlášen, zobraz chráněný obsah
    return children;
};

export default PrivateRoute;