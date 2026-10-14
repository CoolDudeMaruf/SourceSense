import React from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl p-3 rounded-xl border border-slate-200/90 shadow-xl font-sans text-xs min-w-[150px]">
      <div className="text-[10px] font-mono text-slate-500 mb-1.5 pb-1 border-b border-slate-100">
        TIME: {label}
      </div>
      <div className="space-y-1 font-mono">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex justify-between items-center text-[11px]" style={{ color: p.color }}>
            <span className="font-medium">{p.name}:</span>
            <span className="font-extrabold">{p.value != null ? Number(p.value).toFixed(1) : '—'} µg/m³</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TimelineChart({ readings = [], pm10Threshold = 50 }) {
  const data = readings
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((r) => {
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
    <div className="tech-card bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 shadow-sm" />
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
            High-Resolution PM Telemetry Horizon (Historical Window)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5 font-bold text-sky-600">
            <span className="w-2 h-2 rounded-sm bg-sky-500" /> PM10 Corrected
          </span>
          <span className="flex items-center gap-1.5 font-bold text-emerald-600">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" /> PM2.5 Corrected
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-600">
            <span className="w-2.5 h-0.5 bg-rose-500" /> Threshold ({pm10Threshold} µg)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientPm10" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="gradientPm25" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.7)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            unit=" µg"
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={pm10Threshold}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: `Limit: ${pm10Threshold}`, position: 'right', fontSize: 10, fill: '#ef4444', fontWeight: 700 }}
          />
          <Area
            type="monotone"
            dataKey="pm10"
            name="PM10"
            stroke="#0284c7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#gradientPm10)"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5"
            stroke="#10b981"
            strokeWidth={1.8}
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
