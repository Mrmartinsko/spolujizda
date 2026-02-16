import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) {
      authService.getCurrentUser()
        .then(userData => setUser(userData))
        .catch((err) => {
            const data = err.response?.data;

            localStorage.removeItem('token');
            setUser(null);

            // pokud backend řekne, že je potřeba ověření emailu
            if (err.response?.status === 403 && data?.requires_email_verification) {
                // nechceme tady dělat navigate (context není router),
                // ale můžeme si uložit email a VerifyEmail si ho může načíst
                sessionStorage.setItem('pending_verify_email_only', data.email || '');
            }
            })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // LOGIN: musí throw error, aby Login.js catch fungoval
  const login = async (email, password) => {
    const data = await authService.login(email, password);
    // pokud backend pustí, bude tam access_token
    const { access_token, uzivatel } = data;

    localStorage.setItem('token', access_token);
    setUser(uzivatel);

    return data;
  };

  // REGISTER: backend už nevrací token, jen requires_email_verification
  // taky bude throw error při failu
  const register = async (userData) => {
    const data = await authService.register(userData);
    // nic neukládáme do localStorage, jen vrátíme odpověď
    // (frontend tě přesměruje na /verify-email)
    return data;
  };

  const resendVerification = async (email) => {
    return await authService.resendVerification(email);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAuthenticated = !!localStorage.getItem('token'); // klíčové pro PrivateRoute

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    resendVerification,
    logout,
    isAuthenticated,
    token: localStorage.getItem('token'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
