import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Settings, Save, X } from 'lucide-react';
import { api } from '../utils/api';

function NodeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', location_lat: 19.076, location_lon: 72.8777,
    description: '', site_manager_name: '',
    site_manager_email: '', site_manager_phone: '',
    pm10_threshold: 50, relay_delay_min: 5,
    calib_a: 0.33, calib_b: 0.17,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
        {initial ? 'Edit Node' : 'Add New Node'}
      </div>
      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="stat-label">Node Name *</label>
          <input className="ss-input w-full mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mumbai_Node_01" />
        </div>
        <div>
          <label className="stat-label">Description</label>
          <input className="ss-input w-full mt-1" value={form.description || ''} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="stat-label">Latitude</label>
          <input className="ss-input w-full mt-1" type="number" step="0.0001" value={form.location_lat} onChange={e => set('location_lat', parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="stat-label">Longitude</label>
          <input className="ss-input w-full mt-1" type="number" step="0.0001" value={form.location_lon} onChange={e => set('location_lon', parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="stat-label">Site Manager Name</label>
          <input className="ss-input w-full mt-1" value={form.site_manager_name || ''} onChange={e => set('site_manager_name', e.target.value)} />
        </div>
        <div>
          <label className="stat-label">Site Manager Email</label>
          <input className="ss-input w-full mt-1" type="email" value={form.site_manager_email || ''} onChange={e => set('site_manager_email', e.target.value)} />
        </div>
        <div>
          <label className="stat-label">Phone</label>
          <input className="ss-input w-full mt-1" value={form.site_manager_phone || ''} onChange={e => set('site_manager_phone', e.target.value)} placeholder="+91..." />
        </div>
        <div>
          <label className="stat-label">PM10 Threshold (µg/m³)</label>
          <input className="ss-input w-full mt-1" type="number" value={form.pm10_threshold} onChange={e => set('pm10_threshold', parseFloat(e.target.value))} />
        </div>
        <div>
          <label className="stat-label">Relay Delay (minutes)</label>
          <input className="ss-input w-full mt-1" type="number" min="1" value={form.relay_delay_min} onChange={e => set('relay_delay_min', parseInt(e.target.value))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="stat-label">Calibration a</label>
            <input className="ss-input w-full mt-1" type="number" step="0.01" value={form.calib_a} onChange={e => set('calib_a', parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="stat-label">Calibration b</label>
            <input className="ss-input w-full mt-1" type="number" step="0.01" value={form.calib_b} onChange={e => set('calib_b', parseFloat(e.target.value))} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="btn-primary flex items-center gap-1.5" onClick={() => onSave(form)}>
          <Save size={13} /> Save Node
        </button>
        <button className="btn-ghost flex items-center gap-1.5" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function NodeManagement() {
  const [nodes, setNodes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.getNodes(false).then(d => setNodes(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editNode) {
        await api.updateNode(editNode.id, form);
      } else {
        await api.createNode(form);
      }
      setShowForm(false);
      setEditNode(null);
      load();
    } catch (e) {
      setError('Failed to save node. Please check the form.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this node?')) return;
    await api.deleteNode(id);
    load();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Node Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0' }}>
            Configure sensor nodes, thresholds, and calibration
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => { setShowForm(true); setEditNode(null); }}>
          <Plus size={14} /> Add Node
        </button>
      </div>

      {error && (
        <div className="glass-card p-3 mb-4" style={{ borderColor: '#f87171', color: '#f87171', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {(showForm && !editNode) && (
        <div className="mb-4">
          <NodeForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading nodes…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {nodes.map(node => (
            <div key={node.id}>
              {editNode?.id === node.id ? (
                <NodeForm
                  initial={editNode}
                  onSave={handleSave}
                  onCancel={() => setEditNode(null)}
                />
              ) : (
                <div className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          style={{ width: 8, height: 8, borderRadius: '50%',
                          background: node.is_active ? '#4ade80' : '#4a5876' }}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{node.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          id:{node.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <MapPin size={11} />
                        {node.location_lat.toFixed(4)}, {node.location_lon.toFixed(4)}
                        {node.description && ` — ${node.description}`}
                      </div>
                      <div className="flex flex-wrap gap-3" style={{ fontSize: '0.72rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>PM10 Threshold:</span> {node.pm10_threshold} µg/m³
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Relay Delay:</span> {node.relay_delay_min} min
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Calib:</span> a={node.calib_a} b={node.calib_b}
                        </span>
                        {node.site_manager_name && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Manager:</span> {node.site_manager_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost flex items-center gap-1"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => { setEditNode(node); setShowForm(false); }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        className="btn-ghost flex items-center gap-1"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#f87171', borderColor: '#f8717133' }}
                        onClick={() => handleDelete(node.id)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {nodes.length === 0 && (
            <div className="glass-card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
              No nodes configured. Click "Add Node" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
