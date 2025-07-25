import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authService.getCurrentUser()
                .then(userData => {
                    setUser(userData);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, heslo) => {
        try {
            const response = await authService.login(email, heslo);
            const { access_token, uzivatel } = response;

            localStorage.setItem('token', access_token);
            setUser(uzivatel);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Chyba při přihlašování'
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authService.register(userData);
            const { access_token, uzivatel } = response;

            localStorage.setItem('token', access_token);
            setUser(uzivatel);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Chyba při registraci'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        token: localStorage.getItem('token')
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
