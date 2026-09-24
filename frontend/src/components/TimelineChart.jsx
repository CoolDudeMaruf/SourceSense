import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3" style={{ fontSize: '0.75rem', minWidth: 140 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value != null ? Number(p.value).toFixed(1) : '—'} µg/m³
        </div>
      ))}
    </div>
  );
};

/**
 * TimelineChart – PM10 / PM2.5 over time with gap markers and threshold line.
 */
export default function TimelineChart({ readings = [], pm10Threshold = 50 }) {
  const data = readings
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((r, i, arr) => {
      const gapFlag = r.quality_flags?.timestamp === 'logging_gap';
      return {
        time: format(new Date(r.timestamp), 'HH:mm:ss'),
        pm10: r.pm10_corrected,
        pm25: r.pm2_5_corrected,
        pm10raw: r.pm10_raw,
        isGap: gapFlag,
        isFailed: r.quality_flags?.pm10 === 'failed_read',
      };
    });

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          PM Timeline
        </span>
        <div className="flex items-center gap-3" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#38bdf8' }}>■ PM10 corrected</span>
          <span style={{ color: '#4ade80' }}>■ PM2.5 corrected</span>
          <span style={{ color: '#f87171' }}>– threshold</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#4a5876' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#4a5876' }}
            tickLine={false}
            axisLine={false}
            unit=" µg"
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={pm10Threshold}
            stroke="#f87171"
            strokeDasharray="4 2"
            label={{ value: `Threshold ${pm10Threshold}`, position: 'right', fontSize: 9, fill: '#f87171' }}
          />
          <Line
            type="monotone"
            dataKey="pm10"
            name="PM10"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={(props) => {
              const { payload, cx, cy } = props;
              if (payload.isFailed) return <circle key={props.key} cx={cx} cy={cy} r={5} fill="#f87171" stroke="#f87171" />;
              if (payload.isGap) return <circle key={props.key} cx={cx} cy={cy} r={5} fill="#22d3ee" stroke="#22d3ee" strokeDasharray="3" />;
              return <circle key={props.key} cx={cx} cy={cy} r={2.5} fill="#38bdf8" />;
            }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {data.some(d => d.isGap) && (
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: '0.68rem', color: '#22d3ee' }}>
          <span>●</span> cyan dots = timestamp gaps &gt;10 min
        </div>
      )}
    </div>
  );
}
