// Robustly build the API base URL.
// Render injects VITE_API_URL as just a hostname (e.g. "sourcesense-backend-xxxx.onrender.com"),
// without the https:// scheme. We detect this and fix it automatically.
function buildApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) {
    // No env var - use relative URL in production (served from same origin) or localhost in dev
    return import.meta.env.MODE === 'development' ? 'http://localhost:8000' : '';
  }
  // If the value is already a full URL, use it as-is
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  // Otherwise it's just a hostname injected by Render - prepend https://
  return `https://${raw}`;
}
const API_BASE = buildApiBase();

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

export const WS_BASE = (() => {
  const raw = import.meta.env.VITE_WS_URL;
  if (!raw) {
    if (import.meta.env.MODE === 'development') return 'ws://localhost:8000';
    return (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
  }
  // If it's already a ws/wss URL, use as-is
  if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw;
  // Render injects a bare hostname - convert to wss://
  return `wss://${raw}`;
})();
