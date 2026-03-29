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

  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await api.get(`/auth/reset-password/${token}`);
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword
    });
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
