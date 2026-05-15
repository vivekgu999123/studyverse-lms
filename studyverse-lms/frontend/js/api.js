// ===================== API UTILITY =====================
const API_BASE = '/api';

const api = {
  getToken: () => localStorage.getItem('st_token'),

  headers: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('st_token') ? { Authorization: `Bearer ${localStorage.getItem('st_token')}` } : {})
  }),

  async request(method, endpoint, body = null) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: api.headers(),
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  },

  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, body) => api.request('POST', endpoint, body),
  put: (endpoint, body) => api.request('PUT', endpoint, body),
  delete: (endpoint) => api.request('DELETE', endpoint),
};
