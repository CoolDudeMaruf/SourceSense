import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Filter, Download, ChevronUp, ChevronDown, CheckCircle, Zap } from 'lucide-react';
import QualityFlagBadge from './QualityFlagBadge';

export default function EventLogTable({ events = [], onExport }) {
  const [filterAction, setFilterAction] = useState('');
  const [filterFlag, setFilterFlag] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let e = [...events];
    if (filterAction) e = e.filter((ev) => ev.relay_action === filterAction);
    if (filterFlag) {
      e = e.filter((ev) => {
        const flags = ev.quality_flags || {};
        return (
          Object.values(flags).includes(filterFlag) ||
          Object.keys(flags).some((k) => k.startsWith('mq') && flags[k] === filterFlag)
        );
      });
    }
    e.sort((a, b) => {
      const d = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir === 'desc' ? -d : d;
    });
    return e;
  }, [events, filterAction, filterFlag, sortDir]);

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Filter size={13} />
          </div>
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
            Automated Mitigation Events
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200">
            {filtered.length} records
          </span>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="tech-select font-mono text-xs"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">All Relay Actions</option>
            <option value="ON">Relay ENGAGED (ON)</option>
            <option value="OFF">Relay DISENGAGED (OFF)</option>
          </select>

          <select
            className="tech-select font-mono text-xs"
            value={filterFlag}
            onChange={(e) => setFilterFlag(e.target.value)}
          >
            <option value="">All Data Quality Flags</option>
            <option value="failed_read">Failed Read</option>
            <option value="sensor_glitch">Sensor Glitch</option>
            <option value="logging_gap">Logging Gap</option>
            <option value="below_detection">Below Detection</option>
          </select>

          {onExport && (
            <button className="tech-btn" onClick={onExport}>
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-slate-50/80 backdrop-blur-md text-slate-600 uppercase text-[10px] border-b border-slate-200/80">
            <tr>
              <th
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                className="p-3 cursor-pointer select-none hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Timestamp</span>
                  {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </div>
              </th>
              <th className="p-3">Relay Action</th>
              <th className="p-3">PM10 (Corr.)</th>
              <th className="p-3">Pollutant Source</th>
              <th className="p-3">Confidence</th>
              <th className="p-3">Quality Flags</th>
              <th className="p-3">Action Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">
                  No mitigation events match current filters.
                </td>
              </tr>
            ) : (
              filtered.map((ev, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 text-slate-600 whitespace-nowrap">
                    {format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ev.relay_action === 'ON'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {ev.relay_action === 'ON' ? <Zap size={10} className="text-rose-600" /> : null}
                      {ev.relay_action === 'ON' ? 'ENGAGED' : 'STANDBY'}
                    </span>
                  </td>
                  <td className="p-3 font-extrabold text-slate-900">
                    {ev.pm10_corrected != null ? `${Number(ev.pm10_corrected).toFixed(1)} µg/m³` : '—'}
                  </td>
                  <td className="p-3 text-blue-700 font-bold">
                    {ev.classifier_label ? ev.classifier_label.replace(/_/g, ' ') : 'Normal Baseline'}
                  </td>
                  <td className="p-3 text-slate-700 font-semibold">
                    {ev.classifier_confidence != null ? `${(ev.classifier_confidence * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="p-3">
                    <QualityFlagBadge flags={ev.quality_flags || {}} compact />
                  </td>
                  <td className="p-3 text-slate-600 max-w-[280px] truncate" title={ev.action_reason || ''}>
                    {ev.action_reason || 'Autonomous regulation cycle'}
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
