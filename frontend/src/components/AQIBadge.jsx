import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getAQIInfo } from '../utils/aqiColors';

export default function AQIBadge({ aqi, category, size = 'md', pm25Subindex, pm10Subindex, prevAqi }) {
  const info = getAQIInfo(aqi);
  const isPoor = aqi >= 201;

  const sizes = {
    sm: { num: 'text-2xl', cat: 'text-[10px]', pad: 'p-3' },
    md: { num: 'text-4xl', cat: 'text-xs', pad: 'p-4' },
    lg: { num: 'text-5xl', cat: 'text-xs', pad: 'p-5' },
  };
  const s = sizes[size] || sizes.md;

  // Determine which pollutant is driving the AQI
  const pm25IsDriving = pm25Subindex != null && pm10Subindex != null && pm25Subindex > pm10Subindex;
  const pm10IsDriving = pm25Subindex != null && pm10Subindex != null && pm10Subindex > pm25Subindex;
  const driverLabel = pm25IsDriving ? 'PM2.5 driver' : pm10IsDriving ? 'PM10 driver' : null;

  // Trend indicator
  const trend = prevAqi != null && aqi != null
    ? aqi > prevAqi + 5 ? 'up'
      : aqi < prevAqi - 5 ? 'down'
        : 'stable'
    : null;

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.pad} rounded-2xl w-full max-w-[280px] backdrop-blur-md transition-all duration-300 relative`}
      style={{
        background: `linear-gradient(135deg, ${info.color}15, rgba(255, 255, 255, 0.8))`,
        border: `1.5px solid ${info.color}40`,
        boxShadow: isPoor ? `0 8px 24px -2px ${info.color}30` : '0 4px 16px -2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Trend indicator arrow */}
      {trend && (
        <div className="absolute top-3 right-3 p-1 rounded-full bg-white/80 shadow-sm border border-slate-200/80">
          {trend === 'up' && <TrendingUp size={12} className="text-rose-500" />}
          {trend === 'down' && <TrendingDown size={12} className="text-emerald-500" />}
          {trend === 'stable' && <Minus size={12} className="text-slate-400" />}
        </div>
      )}

      <div className={`font-black ${s.num} font-mono leading-none tracking-tight`} style={{ color: info.color }}>
        {aqi ?? '—'}
      </div>
      <div
        className={`mt-2 font-bold ${s.cat} px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm`}
        style={{
          background: `${info.color}20`,
          color: info.color,
          border: `1px solid ${info.color}44`,
        }}
      >
        {category || info.label}
      </div>
      <div className="mt-1 text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest">
        CPCB NAQI STANDARD
      </div>

      {/* Sub-index breakdown */}
      {(pm25Subindex != null || pm10Subindex != null) && (
        <div className="mt-3 w-full flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 font-mono">
          {pm25Subindex != null && (
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-medium">PM2.5:</span>
              <div className="flex-1 mx-2 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                <div
                  style={{ width: `${Math.min((pm25Subindex / 500) * 100, 100)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${pm25IsDriving ? 'bg-rose-500' : 'bg-emerald-500'}`}
                />
              </div>
              <span className={`font-bold ${pm25IsDriving ? 'text-rose-600' : 'text-slate-700'}`}>
                {pm25Subindex}
              </span>
            </div>
          )}
          {pm10Subindex != null && (
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500 font-medium">PM10:</span>
              <div className="flex-1 mx-2 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                <div
                  style={{ width: `${Math.min((pm10Subindex / 500) * 100, 100)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${pm10IsDriving ? 'bg-rose-500' : 'bg-sky-500'}`}
                />
              </div>
              <span className={`font-bold ${pm10IsDriving ? 'text-rose-600' : 'text-slate-700'}`}>
                {pm10Subindex}
              </span>
            </div>
          )}
          {driverLabel && (
            <div className="text-center text-[9.5px] text-rose-600 font-extrabold tracking-wider mt-1">
              ⚡ {driverLabel.toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
