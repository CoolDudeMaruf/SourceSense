import { Wind, Thermometer, Droplets, AlertTriangle, Flame, Zap, Battery, Sun } from 'lucide-react';
import QualityFlagBadge from './QualityFlagBadge';

function PMBar({ label, value, maxVal, color, spikeThreshold }) {
  const pct = value != null ? Math.min((value / maxVal) * 100, 100) : 0;
  const isSpiking = value != null && spikeThreshold != null && value > spikeThreshold;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isSpiking ? '#f87171' : 'var(--text-secondary)' }}>
          {value != null ? `${Number(value).toFixed(1)} µg/m³` : '—'}
          {isSpiking && <span style={{ marginLeft: 4, color: '#f87171' }}>▲ SPIKE</span>}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: isSpiking
              ? 'linear-gradient(90deg, #f97316, #ef4444)'
              : `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: 3,
            transition: 'width 0.6s ease',
            boxShadow: isSpiking ? `0 0 8px ${color}88` : 'none',
          }}
        />
      </div>
    </div>
  );
}

function MQRow({ label, value, warningAbove, color }) {
  const isHigh = value != null && warningAbove != null && value > warningAbove;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(30,45,69,0.4)' }}>
      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isHigh ? color : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
        {isHigh && <AlertTriangle size={9} color={color} />}
        {value != null ? Number(value).toFixed(0) : '—'}
      </span>
    </div>
  );
}

/**
 * LiveReadingsCard – shows all sensor readings: PM1.0/PM2.5/PM10 with spike bars,
 * gas sensor readings (MQ2/4/6/7/8/131/135), temp, humidity with quality indicators.
 * Highlights which PM band caused any AQI spike.
 */
export default function LiveReadingsCard({ reading }) {
  if (!reading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center" style={{ minHeight: 180 }}>
        <span style={{ color: 'var(--text-muted)' }}>Waiting for data…</span>
      </div>
    );
  }

  const flags = reading.quality_flags || {};
  const pm10Failed = flags.pm10 === 'failed_read';
  const humidityGlitch = flags.humidity === 'sensor_glitch';
  const pm1Warming = flags.pm_dual === 'possible_warmup';
  const pm1Below = flags.pm_dual === 'below_detection';

  // Determine spike reason for AQI
  const pm25SI = reading.aqi_pm25_subindex;
  const pm10SI = reading.aqi_pm10_subindex;
  const pm25Driving = pm25SI != null && pm10SI != null && pm25SI >= pm10SI;
  const pm10Driving = pm25SI != null && pm10SI != null && pm10SI > pm25SI;

  // Build spike reason message
  let spikeReason = null;
  if (reading.aqi >= 200) {
    if (pm25Driving) spikeReason = `PM2.5 sub-index (${pm25SI}) is driving AQI to ${reading.aqi_category} level`;
    else if (pm10Driving) spikeReason = `PM10 sub-index (${pm10SI}) is driving AQI to ${reading.aqi_category} level`;
  }

  const hasMQData = reading.mq2 != null || reading.mq7 != null || reading.mq135 != null;

  return (
    <div className="glass-card p-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wind size={16} color="var(--brand-400)" />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            Live Sensor Readings
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          {reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : '—'}
        </span>
      </div>

      {/* Spike Banner */}
      {spikeReason && (
        <div style={{
          marginBottom: 12,
          padding: '7px 12px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>{spikeReason}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {/* Left: PM values with bars */}
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Particulate Matter
          </div>
          <PMBar
            label="PM1.0"
            value={reading.pm1_0_raw}
            maxVal={200}
            color="#60a5fa"
            spikeThreshold={null}
          />
          <PMBar
            label="PM2.5 raw"
            value={reading.pm2_5_raw}
            maxVal={250}
            color={pm25Driving ? '#f87171' : '#4ade80'}
            spikeThreshold={60}
          />
          <PMBar
            label="PM2.5 corr."
            value={reading.pm2_5_corrected}
            maxVal={250}
            color="#4ade80"
            spikeThreshold={null}
          />
          <PMBar
            label={`PM10 raw${pm10Failed ? ' ⚠ FAILED' : ''}`}
            value={pm10Failed ? null : reading.pm10_raw}
            maxVal={430}
            color={pm10Driving ? '#f87171' : '#38bdf8'}
            spikeThreshold={100}
          />
          <PMBar
            label="PM10 corr."
            value={reading.pm10_corrected}
            maxVal={430}
            color="#38bdf8"
            spikeThreshold={null}
          />
          {(pm1Warming || pm1Below) && (
            <div style={{ fontSize: '0.6rem', color: '#60a5fa', marginTop: 4 }}>
              ⓘ Sensor may be in warmup / below detection limit
            </div>
          )}
        </div>

        {/* Right: Gas sensors + ambient */}
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Gas & Ambient
          </div>

          {/* Temp, Humidity & Power */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, padding: '5px 0', borderBottom: '1px solid rgba(30,45,69,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Thermometer size={11} color="var(--text-muted)" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {reading.temperature_c?.toFixed(1) ?? '—'}°C
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Droplets size={11} color={humidityGlitch ? '#c084fc' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.72rem', color: humidityGlitch ? '#c084fc' : 'var(--text-secondary)', fontWeight: 600 }}>
                {reading.humidity_percent?.toFixed(1) ?? '—'}%{humidityGlitch && ' ⚠'}
              </span>
            </div>
            {reading.battery_level != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Battery size={11} color="var(--brand-400)" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {reading.battery_level?.toFixed(0)}%
                </span>
              </div>
            )}
            {reading.is_solar_charging && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Solar Charging Active">
                <Sun size={11} color="#fbbf24" />
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                  Charging
                </span>
              </div>
            )}
          </div>

          {/* MQ Gas Sensors */}
          {hasMQData ? (
            <>
              <MQRow label="MQ2 (LPG/Smoke)" value={reading.mq2} warningAbove={400} color="#fbbf24" />
              <MQRow label="MQ4 (Methane)" value={reading.mq4} warningAbove={350} color="#fb923c" />
              <MQRow label="MQ6 (Butane)" value={reading.mq6} warningAbove={350} color="#fb923c" />
              <MQRow label="MQ7 (CO)" value={reading.mq7} warningAbove={300} color="#f87171" />
              <MQRow label="MQ8 (H₂)" value={reading.mq8} warningAbove={400} color="#a78bfa" />
              <MQRow label="MQ131 (Ozone)" value={reading.mq131} warningAbove={300} color="#34d399" />
              <MQRow label="MQ135 (Air Q)" value={reading.mq135} warningAbove={400} color="#f472b6" />
            </>
          ) : (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: 8 }}>
              Gas sensor readings not available
            </div>
          )}

          {/* Sensor Trust Score */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>SENSOR TRUST</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: (reading.sensor_trust_score || 100) > 80 ? '#4ade80'
                  : (reading.sensor_trust_score || 100) > 50 ? '#fbbf24' : '#f87171'
              }}>
                {reading.sensor_trust_score || 100}%
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${reading.sensor_trust_score || 100}%`,
                height: '100%',
                background: (reading.sensor_trust_score || 100) > 80 ? '#4ade80'
                  : (reading.sensor_trust_score || 100) > 50 ? '#fbbf24' : '#f87171',
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quality Flags */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <QualityFlagBadge flags={flags} />
      </div>
    </div>
  );
}
