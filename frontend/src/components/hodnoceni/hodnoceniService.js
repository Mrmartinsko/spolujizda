
import api from './api';

const hodnoceniService = {
  create: (data) => api.post('/hodnoceni/', data),

  getUzivatelova: (uzivatelId, role = null) =>
    api.get(`/hodnoceni/uzivatel/${uzivatelId}${role ? `?role=${role}` : ''}`),

  getMoje: () => api.get('/hodnoceni/moje'),

  update: (id, data) => api.put(`/hodnoceni/${id}`, data),

  remove: (id) => api.delete(`/hodnoceni/${id}`),
};

export default hodnoceniService;
