import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import EventLogTable from '../components/EventLogTable';
import { api } from '../utils/api';

export default function EventLog() {
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNodes().then(d => setNodes(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getEvents({ node_id: selectedNode || undefined, limit: 200 })
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [selectedNode]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Suppression Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0' }}>
            Full log of relay ON/OFF events with source classification
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="ss-input"
            value={selectedNode}
            onChange={e => setSelectedNode(e.target.value)}
          >
            <option value="">All Nodes</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => api.exportCSV(selectedNode || undefined)}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading events…</div>
      ) : (
        <EventLogTable
          events={events}
          onExport={() => api.exportCSV(selectedNode || undefined)}
        />
      )}
    </div>
  );
}
