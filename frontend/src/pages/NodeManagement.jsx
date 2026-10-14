import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Settings, Save, X } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import { api } from '../utils/api';

function NodeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      name: '',
      location_lat: 19.076,
      location_lon: 72.8777,
      description: '',
      site_manager_name: '',
      site_manager_email: '',
      site_manager_phone: '',
      pm10_threshold: 50,
      relay_delay_min: 5,
      calib_a: 0.33,
      calib_b: 0.17,
      control_mode: 'AUTONOMOUS',
    }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="tech-card p-5 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-lg mb-4">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <Settings size={16} className="text-blue-700" />
          {initial ? `Edit Node Configuration: ${initial.name}` : 'Provision New Hardware Sensor Node'}
        </span>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Node Identifier *</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Dhaka_Gazipur_Node_30"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Site Description</label>
          <input
            className="tech-input w-full mt-1"
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="e.g. Heavy Industrial Emission Zone"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Latitude (WGS84)</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            type="number"
            step="0.0001"
            value={form.location_lat}
            onChange={(e) => set('location_lat', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Longitude (WGS84)</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            type="number"
            step="0.0001"
            value={form.location_lon}
            onChange={(e) => set('location_lon', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">PM10 Alarm Threshold (µg/m³)</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            type="number"
            value={form.pm10_threshold}
            onChange={(e) => set('pm10_threshold', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Relay Persistence Delay (minutes)</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            type="number"
            min="0"
            value={form.relay_delay_min}
            onChange={(e) => set('relay_delay_min', parseInt(e.target.value))}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Site Manager Name</label>
          <input
            className="tech-input w-full mt-1"
            value={form.site_manager_name || ''}
            onChange={(e) => set('site_manager_name', e.target.value)}
          />
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Site Manager Contact Email</label>
          <input
            className="tech-input w-full mt-1 font-mono"
            type="email"
            value={form.site_manager_email || ''}
            onChange={(e) => set('site_manager_email', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-mono font-medium text-slate-600">RH Calib slope (a)</label>
            <input
              className="tech-input w-full mt-1 font-mono"
              type="number"
              step="0.01"
              value={form.calib_a}
              onChange={(e) => set('calib_a', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-[11px] font-mono font-medium text-slate-600">RH Calib intercept (b)</label>
            <input
              className="tech-input w-full mt-1 font-mono"
              type="number"
              step="0.01"
              value={form.calib_b}
              onChange={(e) => set('calib_b', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono font-medium text-slate-600">Control Mode</label>
          <select
            className="tech-select w-full mt-1 font-mono"
            value={form.control_mode || 'AUTONOMOUS'}
            onChange={(e) => set('control_mode', e.target.value)}
          >
            <option value="AUTONOMOUS">AUTONOMOUS (TinyML & SCADA Controlled)</option>
            <option value="SIMULATION">SIMULATION (Demonstration / Mock Feeder)</option>
            <option value="MANUAL">MANUAL (Human Operator Interlock)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mt-5 pt-3 border-t border-slate-100">
        <button className="tech-btn tech-btn-primary" onClick={() => onSave(form)}>
          <Save size={13} /> Save Node Configuration
        </button>
        <button className="tech-btn" onClick={onCancel}>
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
    api.getNodes(false)
      .then((d) => setNodes(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

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
    } catch {
      setError('Failed to save node configuration.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this node from telemetry network?')) return;
    await api.deleteNode(id);
    load();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <AppNavbar nodes={nodes} />

      <main className="flex-1 max-w-[1780px] w-full mx-auto px-4 py-4 space-y-4">
        {/* Header Ribbon */}
        <div className="tech-card p-4 flex items-center justify-between flex-wrap gap-3 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-slate-900 tracking-wide font-sans">
                HARDWARE NODE TOPOLOGY & CALIBRATION
              </span>
              <span className="tech-badge tech-badge-clean">{nodes.length} NODES CONFIGURED</span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Hardware node provisioning, particulate alarm thresholds, and relative humidity calibration coefficients
            </p>
          </div>

          <button
            className="tech-btn tech-btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditNode(null);
            }}
          >
            <Plus size={14} /> Provision Node
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-700 text-xs rounded-xl shadow-sm">
            {error}
          </div>
        )}

        {showForm && !editNode && (
          <NodeForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        )}

        {/* Nodes Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading hardware node configurations...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => (
              <div key={node.id}>
                {editNode?.id === node.id ? (
                  <NodeForm
                    initial={editNode}
                    onSave={handleSave}
                    onCancel={() => setEditNode(null)}
                  />
                ) : (
                  <div className="tech-card p-4 flex flex-col justify-between h-full bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="font-bold text-sm text-slate-900">{node.name}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                            ID: #{node.id} | ZONE: {node.zone || 'Metropolitan'}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100/80 border border-slate-200 text-blue-700">
                          {node.control_mode || 'AUTONOMOUS'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                        <MapPin size={12} className="text-blue-600 shrink-0" />
                        <span>{node.location_lat?.toFixed(4)}, {node.location_lon?.toFixed(4)}</span>
                        {node.description && <span className="truncate max-w-[180px]">({node.description})</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/70 backdrop-blur-md border border-slate-200/80 font-mono text-[11px] mb-3">
                        <div>
                          <span className="text-slate-500">PM10 LIMIT:</span>
                          <span className="text-amber-700 font-bold ml-1.5">{node.pm10_threshold} µg</span>
                        </div>
                        <div>
                          <span className="text-slate-500">DELAY:</span>
                          <span className="text-slate-700 ml-1.5">{node.relay_delay_min} min</span>
                        </div>
                        <div>
                          <span className="text-slate-500">CALIB A:</span>
                          <span className="text-slate-700 ml-1.5">{node.calib_a}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">CALIB B:</span>
                          <span className="text-slate-700 ml-1.5">{node.calib_b}</span>
                        </div>
                      </div>

                      {node.site_manager_name && (
                        <div className="text-[11px] text-slate-500 truncate mb-3">
                          <span className="text-slate-400">Manager:</span> {node.site_manager_name} ({node.site_manager_email || 'No email'})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        className="tech-btn text-xs"
                        onClick={() => {
                          setEditNode(node);
                          setShowForm(false);
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        className="tech-btn tech-btn-danger text-xs"
                        onClick={() => handleDelete(node.id)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
