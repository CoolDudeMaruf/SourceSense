const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.MODE === 'development' ? 'http://localhost:8000' : '');

export const api = {
  // Nodes
  getNodes: () => fetch(`${API_BASE}/api/v1/nodes`).then(r => r.json()),
  createNode: (data) => fetch(`${API_BASE}/api/v1/nodes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json()),
  updateNode: (id, data) => fetch(`${API_BASE}/api/v1/nodes/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteNode: (id) => fetch(`${API_BASE}/api/v1/nodes/${id}`, { method: 'DELETE' }),

  // Readings
  getReadings: (nodeId, limit = 100) => {
    const params = new URLSearchParams({ limit });
    if (nodeId) params.set('node_id', nodeId);
    return fetch(`${API_BASE}/api/v1/readings?${params}`).then(r => r.json());
  },

  // Events
  getEvents: (filters = {}) => {
    const params = new URLSearchParams(Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== '')
    ));
    return fetch(`${API_BASE}/api/v1/events?${params}`).then(r => r.json());
  },

  // Export
  exportCSV: (nodeId) => {
    const params = nodeId ? `?node_id=${nodeId}` : '';
    window.open(`${API_BASE}/api/v1/export/csv${params}`, '_blank');
  },

  // Forecast
  getForecast: (nodeId) => fetch(`${API_BASE}/api/v1/forecast/${nodeId}`).then(r => r.json()),
};

export const WS_BASE = import.meta.env.VITE_WS_URL !== undefined 
  ? import.meta.env.VITE_WS_URL 
  : (import.meta.env.MODE === 'development' 
      ? 'ws://localhost:8000' 
      : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host);
