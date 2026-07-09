const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
let token = localStorage.getItem('token');

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Check if response is a file download
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('spreadsheet') || contentType.includes('csv') || contentType.includes('octet-stream'))) {
    return response;
  }

  return response.json();
}

export const api = {
  setToken(t) { token = t; },

  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  // Leads
  searchLeads: (city, niche, limit) =>
    request('/leads/search', { method: 'POST', body: JSON.stringify({ city, niche, limit }) }),
  getLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leads?${query}`);
  },
  saveLeads: (leads) =>
    request('/leads/save', { method: 'POST', body: JSON.stringify({ leads }) }),
  saveManualLead: (data) =>
    request('/leads/manual', { method: 'POST', body: JSON.stringify(data) }),
  enrichLead: (id, data) =>
    request(`/leads/${id}/enrich`, { method: 'PUT', body: JSON.stringify(data) }),
  updateLeadStatus: (id, status) =>
    request(`/leads/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteLead: (id) =>
    request(`/leads/${id}`, { method: 'DELETE' }),

  // Export
  exportCSV: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await request(`/export/csv?${query}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  exportExcel: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await request(`/export/excel?${query}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Admin
  getUsers: () => request('/admin/users'),
  createUser: (data) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }),
  getStats: () => request('/admin/stats'),
};
