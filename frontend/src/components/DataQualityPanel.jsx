import { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Zap, Clock, Wind, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import QualityFlagBadge from './QualityFlagBadge';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      className="glass-card p-4 flex items-center gap-3"
      style={{ borderColor: `${color}33` }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: `${color}22`, border: `1px solid ${color}44`,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: '1.4rem', color }}>{value}</div>
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
      { name: 'Failed\nRead', count: failedRead, color: '#f87171' },
      { name: 'Below\nDetect', count: belowDetection, color: '#fbbf24' },
      { name: 'Warmup', count: possibleWarmup, color: '#60a5fa' },
      { name: 'Glitch', count: sensorGlitch, color: '#c084fc' },
      { name: 'Gap', count: loggingGap, color: '#22d3ee' },
    ];

    return { total, flagged: flaggedRows.length, flagRate, failedRead, belowDetection, sensorGlitch, loggingGap, possibleWarmup, barData };
  }, [readings]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={BarChart2}    label="Total Readings" value={stats.total}        color="#38bdf8" />
        <StatCard icon={ShieldAlert}  label="Flagged"         value={stats.flagged}       color="#fbbf24" />
        <StatCard icon={Zap}          label="Failed Reads"    value={stats.failedRead}    color="#f87171" />
        <StatCard icon={AlertTriangle} label="Sensor Glitches" value={stats.sensorGlitch} color="#c084fc" />
      </div>

      {/* Flag rate bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Flag Distribution
          </span>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
            {stats.flagRate}% rows flagged
          </span>
        </div>
        <div className="mb-3">
          <div
            style={{
              height: 8, borderRadius: 4, background: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${stats.flagRate}%`,
                background: 'linear-gradient(90deg, #fbbf24, #f87171)',
                borderRadius: 4,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4a5876' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#4a5876' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.75rem' }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {stats.barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flagged rows table */}
      <div className="glass-card p-4">
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Flagged Rows Detail
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ss-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>PM10 Raw</th>
                <th>Humidity</th>
                <th>Flags</th>
                <th>Source</th>
                <th>AQI</th>
              </tr>
            </thead>
            <tbody>
              {readings
                .filter(r => Object.keys(r.quality_flags || {}).length > 0)
                .map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: r.quality_flags?.pm10 === 'failed_read' ? '#f87171' : 'var(--text-secondary)' }}>
                      {r.pm10_raw ?? <span style={{ color: '#f87171' }}>NULL</span>}
                    </td>
                    <td style={{ color: r.quality_flags?.humidity === 'sensor_glitch' ? '#c084fc' : 'var(--text-secondary)' }}>
                      {r.humidity_percent}%
                    </td>
                    <td><QualityFlagBadge flags={r.quality_flags || {}} compact /></td>
                    <td style={{ fontSize: '0.72rem' }}>{r.classifier_label ?? '—'}</td>
                    <td>{r.aqi ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
