import api from './api';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data.uzivatel;
    },

    changePassword: async (stareHeslo, noveHeslo) => {
        const response = await api.post('/auth/change-password', {
            stare_heslo: stareHeslo,
            nove_heslo: noveHeslo
        });
        return response.data;
    }
};

export default authService;
