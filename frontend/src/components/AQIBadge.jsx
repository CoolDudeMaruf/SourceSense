import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getAQIInfo } from '../utils/aqiColors';

/**
 * AQIBadge – displays AQI number with CPCB category badge.
 * Shows animated pulse for Poor+ categories.
 * Shows PM sub-index spike reasons (PM2.5 vs PM10 driver).
 */
export default function AQIBadge({ aqi, category, size = 'md', pm25Subindex, pm10Subindex, prevAqi }) {
  const info = getAQIInfo(aqi);
  const isPoor = aqi >= 201;

  const sizes = {
    sm: { num: 'text-2xl', cat: 'text-xs', pad: 'p-3' },
    md: { num: 'text-4xl', cat: 'text-sm', pad: 'p-4' },
    lg: { num: 'text-5xl', cat: 'text-base', pad: 'p-5' },
  };
  const s = sizes[size] || sizes.md;

  // Determine which pollutant is driving the AQI
  const pm25IsDriving = pm25Subindex != null && pm10Subindex != null && pm25Subindex > pm10Subindex;
  const pm10IsDriving = pm25Subindex != null && pm10Subindex != null && pm10Subindex > pm25Subindex;
  const driverLabel = pm25IsDriving ? 'PM2.5 driving' : pm10IsDriving ? 'PM10 driving' : null;

  // Trend indicator
  const trend = prevAqi != null && aqi != null
    ? aqi > prevAqi + 5 ? 'up'
    : aqi < prevAqi - 5 ? 'down'
    : 'stable'
    : null;

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.pad} rounded-2xl`}
      style={{
        background: `linear-gradient(135deg, ${info.color}22, ${info.color}08)`,
        border: `1.5px solid ${info.color}55`,
        boxShadow: isPoor ? `0 0 24px ${info.color}44` : 'none',
        position: 'relative',
      }}
    >
      {/* Trend arrow */}
      {trend && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          {trend === 'up' && <TrendingUp size={14} color="#f87171" />}
          {trend === 'down' && <TrendingDown size={14} color="#4ade80" />}
          {trend === 'stable' && <Minus size={14} color="#94a3b8" />}
        </div>
      )}

      <div className={`font-black ${s.num} leading-none`} style={{ color: info.color }}>
        {aqi ?? '—'}
      </div>
      <div
        className={`mt-1.5 font-semibold ${s.cat} px-2 py-0.5 rounded-full`}
        style={{
          background: `${info.color}22`,
          color: info.color,
          border: `1px solid ${info.color}44`,
        }}
      >
        {category || info.label}
      </div>
      <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>CPCB AQI</div>

      {/* Sub-index breakdown */}
      {(pm25Subindex != null || pm10Subindex != null) && (
        <div style={{ marginTop: 8, width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {pm25Subindex != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PM2.5</span>
              <div style={{ flex: 1, margin: '0 6px', height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((pm25Subindex / 500) * 100, 100)}%`, height: '100%', background: pm25IsDriving ? '#f87171' : '#4ade80', borderRadius: 2, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: '0.6rem', color: pm25IsDriving ? '#f87171' : 'var(--text-secondary)', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{pm25Subindex}</span>
            </div>
          )}
          {pm10Subindex != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PM10</span>
              <div style={{ flex: 1, margin: '0 6px', height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((pm10Subindex / 500) * 100, 100)}%`, height: '100%', background: pm10IsDriving ? '#f87171' : '#38bdf8', borderRadius: 2, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: '0.6rem', color: pm10IsDriving ? '#f87171' : 'var(--text-secondary)', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{pm10Subindex}</span>
            </div>
          )}
          {driverLabel && (
            <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#f87171', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>
              ⚡ {driverLabel.toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
