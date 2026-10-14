import { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Zap, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import QualityFlagBadge from './QualityFlagBadge';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      className="glass-card p-4 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        border: `1px solid ${color}30`,
        boxShadow: `0 4px 16px -4px ${color}15`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}18`,
          border: `1px solid ${color}35`,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div className="stat-label" style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div className="stat-value font-mono font-bold" style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * DataQualityPanel – shows flag statistics and per-row quality details.
 */
export default function DataQualityPanel({ readings = [] }) {
  const stats = useMemo(() => {
    const total = readings.length;
    let failedRead = 0, belowDetection = 0, sensorGlitch = 0, loggingGap = 0, possibleWarmup = 0;

    const flaggedRows = readings.filter(r => {
      const flags = r.quality_flags || {};
      const hasMqFailed = Object.entries(flags).some(
        ([k, v]) => k.startsWith('mq') && v === 'failed_read'
      );
      if (flags.pm10 === 'failed_read' || hasMqFailed) failedRead++;
      if (Object.values(flags).includes('below_detection')) belowDetection++;
      if (Object.values(flags).includes('possible_warmup')) possibleWarmup++;
      if (Object.values(flags).includes('sensor_glitch')) sensorGlitch++;
      if (flags.timestamp === 'logging_gap') loggingGap++;
      return Object.keys(flags).length > 0;
    });

    const flagRate = total > 0 ? ((flaggedRows.length / total) * 100).toFixed(1) : 0;

    const barData = [
      { name: 'Failed Read', count: failedRead, color: '#ef4444' },
      { name: 'Below Detect', count: belowDetection, color: '#f59e0b' },
      { name: 'Warmup', count: possibleWarmup, color: '#0284c7' },
      { name: 'Glitch', count: sensorGlitch, color: '#8b5cf6' },
      { name: 'Log Gap', count: loggingGap, color: '#06b6d4' },
    ];

    return { total, flagged: flaggedRows.length, flagRate, failedRead, belowDetection, sensorGlitch, loggingGap, possibleWarmup, barData };
  }, [readings]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={BarChart2}     label="Total Readings" value={stats.total}        color="#0284c7" />
        <StatCard icon={ShieldAlert}   label="Flagged"         value={stats.flagged}      color="#d97706" />
        <StatCard icon={Zap}           label="Failed Reads"    value={stats.failedRead}   color="#dc2626" />
        <StatCard icon={AlertTriangle} label="Sensor Glitches" value={stats.sensorGlitch} color="#7c3aed" />
      </div>

      {/* Flag rate bar and chart */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-sky-500 rounded-sm"></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Telemetry Quality & Flag Distribution
            </span>
          </div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            {stats.flagRate}% anomalous telemetry
          </span>
        </div>
        <div className="mb-4">
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${stats.flagRate}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                borderRadius: 3,
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={stats.barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.7)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(226, 232, 240, 0.9)',
                      boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.12)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: d.color }} className="font-mono">
                      {d.count} occurrences
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {stats.barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flagged rows table */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm"></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Flagged Telemetry Records
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Audit sample: {readings.filter(r => Object.keys(r.quality_flags || {}).length > 0).length} records
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ss-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>PM10 Raw</th>
                <th>Humidity</th>
                <th>Quality Flags</th>
                <th>Source Classified</th>
                <th>AQI</th>
              </tr>
            </thead>
            <tbody>
              {readings
                .filter(r => Object.keys(r.quality_flags || {}).length > 0)
                .map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: r.quality_flags?.pm10 === 'failed_read' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {r.pm10_raw ?? <span style={{ color: '#ef4444', fontWeight: 700 }}>NULL</span>}
                    </td>
                    <td style={{ color: r.quality_flags?.humidity === 'sensor_glitch' ? '#8b5cf6' : 'var(--text-secondary)' }} className="font-mono">
                      {r.humidity_percent != null ? `${r.humidity_percent}%` : '—'}
                    </td>
                    <td><QualityFlagBadge flags={r.quality_flags || {}} compact /></td>
                    <td style={{ fontSize: '0.72rem', fontWeight: 500 }}>{r.classifier_label ?? '—'}</td>
                    <td className="font-mono font-semibold">{r.aqi ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
