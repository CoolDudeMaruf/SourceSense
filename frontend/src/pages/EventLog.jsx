import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import EventLogTable from '../components/EventLogTable';
import { api } from '../utils/api';

export default function EventLog() {
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNodes().then((d) => setNodes(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.getEvents({ node_id: selectedNode || undefined, limit: 200 })
      .then((d) => {
        if (isMounted) setEvents(Array.isArray(d) ? d : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedNode]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <AppNavbar nodes={nodes} />

      <main className="flex-1 max-w-[1780px] w-full mx-auto px-4 py-4 space-y-4">
        {/* Header Ribbon */}
        <div className="tech-card p-4 flex items-center justify-between flex-wrap gap-3 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[15px] text-slate-900 tracking-tight font-sans">
                  PHYSICAL MITIGATION LEDGER & AUDIT TRAIL
                </span>
                <span className="tech-badge tech-badge-muted">CPCB REGULATORY COMPLIANCE</span>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Immutable sequence log of automated actuator relay state transitions, pollution classifications, and suppression verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="tech-select font-mono text-xs"
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              <option value="">All Fleet Nodes</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>

            <button
              className="tech-btn tech-btn-primary"
              onClick={() => api.exportCSV(selectedNode || undefined)}
            >
              <Download size={13} /> Export Regulatory CSV
            </button>
          </div>
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="tech-card p-12 text-center text-slate-400 font-mono text-xs bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl">
            Loading mitigation ledger from backend database...
          </div>
        ) : (
          <div className="tech-card p-4 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <EventLogTable
              events={events}
              onExport={() => api.exportCSV(selectedNode || undefined)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
