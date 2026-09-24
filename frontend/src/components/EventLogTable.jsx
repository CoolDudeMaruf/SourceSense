import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Filter, Download, ChevronUp, ChevronDown } from 'lucide-react';
import QualityFlagBadge from './QualityFlagBadge';
import { exportReadingsToCSV } from '../utils/csvExport';

const RELAY_COLORS = { ON: '#ef4444', OFF: '#4a5876' };

/**
 * EventLogTable – filterable, sortable event log.
 */
export default function EventLogTable({ events = [], readings = [], onExport }) {
  const [filterAction, setFilterAction] = useState('');
  const [filterFlag, setFilterFlag] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let e = [...events];
    if (filterAction) e = e.filter(ev => ev.relay_action === filterAction);
    if (filterFlag) {
      e = e.filter(ev => {
        const flags = ev.quality_flags || {};
        return Object.values(flags).includes(filterFlag) ||
               Object.keys(flags).some(k => k.startsWith('mq') && flags[k] === filterFlag);
      });
    }
    e.sort((a, b) => {
      const d = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir === 'desc' ? -d : d;
    });
    return e;
  }, [events, filterAction, filterFlag, sortDir]);

  return (
    <div className="glass-card p-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Suppression Events
          </span>
          <span
            style={{ fontSize: '0.7rem', color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 999 }}
          >
            {filtered.length} records
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="ss-input"
            style={{ paddingTop: 5, paddingBottom: 5 }}
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="ON">Relay ON</option>
            <option value="OFF">Relay OFF</option>
          </select>
          <select
            className="ss-input"
            style={{ paddingTop: 5, paddingBottom: 5 }}
            value={filterFlag}
            onChange={e => setFilterFlag(e.target.value)}
          >
            <option value="">All Flags</option>
            <option value="failed_read">Failed Read</option>
            <option value="sensor_glitch">Sensor Glitch</option>
            <option value="logging_gap">Logging Gap</option>
            <option value="below_detection">Below Detection</option>
          </select>
          <button className="btn-ghost flex items-center gap-1.5" onClick={onExport}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="ss-table">
          <thead>
            <tr>
              <th
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div className="flex items-center gap-1">
                  Timestamp
                  {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </div>
              </th>
              <th>Action</th>
              <th>PM10 (corr.)</th>
              <th>Source</th>
              <th>Confidence</th>
              <th>Quality Flags</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  No events match current filters
                </td>
              </tr>
            ) : (
              filtered.map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    {format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td>
                    <span
                      style={{
                        color: RELAY_COLORS[ev.relay_action] || '#888',
                        fontWeight: 700, fontSize: '0.8rem',
                      }}
                    >
                      ● {ev.relay_action}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>
                    {ev.pm10_corrected?.toFixed(1) ?? '—'}
                  </td>
                  <td>
                    <span
                      style={{ fontSize: '0.75rem', fontWeight: 600,
                      color: ev.classifier_label === 'construction_dust' ? '#fbbf24' : 'var(--text-secondary)' }}
                    >
                      {ev.classifier_label ?? '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {ev.classifier_confidence != null
                      ? `${(ev.classifier_confidence * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td><QualityFlagBadge flags={ev.quality_flags || {}} compact /></td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 200, fontSize: '0.72rem' }}>
                    {ev.trigger_reason ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
