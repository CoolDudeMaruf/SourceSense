import React from 'react';
import { Wind, Thermometer, Droplets, AlertTriangle, Battery, Sun, Cpu } from 'lucide-react';
import QualityFlagBadge from './QualityFlagBadge';

function PMBar({ label, value, maxVal, color, spikeThreshold }) {
  const pct = value != null ? Math.min((value / maxVal) * 100, 100) : 0;
  const isSpiking = value != null && spikeThreshold != null && value > spikeThreshold;
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10.5px] text-slate-500 font-medium">{label}</span>
        <span className={`text-[11px] font-mono font-bold ${isSpiking ? 'text-rose-600' : 'text-slate-800'}`}>
          {value != null ? `${Number(value).toFixed(1)} µg/m³` : '—'}
          {isSpiking && <span className="ml-1 text-[9px] text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">SPIKE</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
        <div
          style={{
            width: `${pct}%`,
            background: isSpiking
              ? 'linear-gradient(90deg, #f97316, #ef4444)'
              : `linear-gradient(90deg, ${color}99, ${color})`,
          }}
          className="h-full rounded-full transition-all duration-500"
        />
      </div>
    </div>
  );
}

function MQRow({ label, value, warningAbove, color }) {
  const isHigh = value != null && warningAbove != null && value > warningAbove;
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100/80">
      <span className="text-[10px] text-slate-500 font-mono font-medium">{label}</span>
      <span className={`text-[10.5px] font-mono font-bold flex items-center gap-1 ${isHigh ? color : 'text-slate-800'}`}>
        {isHigh && <AlertTriangle size={10} className="text-amber-500" />}
        {value != null ? Number(value).toFixed(0) : '—'}
      </span>
    </div>
  );
}

export default function LiveReadingsCard({ reading }) {
  if (!reading) {
    return (
      <div className="tech-card p-6 flex items-center justify-center min-h-[180px] bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-2xl">
        <span className="text-slate-400 font-mono text-xs">Waiting for telemetry packets...</span>
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

  let spikeReason = null;
  if (reading.aqi >= 200) {
    if (pm25Driving) spikeReason = `PM2.5 sub-index (${pm25SI}) is driving AQI to ${reading.aqi_category} level`;
    else if (pm10Driving) spikeReason = `PM10 sub-index (${pm10SI}) is driving AQI to ${reading.aqi_category} level`;
  }

  const hasMQData = reading.mq2 != null || reading.mq7 != null || reading.mq135 != null;

  return (
    <div className="tech-card bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Wind size={13} />
          </div>
          <span className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
            Live Telemetry Arrays
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/80">
          {reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : '—'}
        </span>
      </div>

      {/* Spike Alert Banner */}
      {spikeReason && (
        <div className="mb-3 p-2 rounded-xl bg-rose-50/80 backdrop-blur-md border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
          <AlertTriangle size={13} className="text-rose-600 shrink-0" />
          <span className="font-semibold text-[10.5px]">{spikeReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Particulate Matter Metering */}
        <div className="bg-slate-50/60 backdrop-blur-md p-3 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
            <span>PARTICULATE CHANNELS</span>
            <span className="text-blue-700 font-extrabold">µg/m³</span>
          </div>

          <PMBar
            label="PM1.0 (Sub-micron)"
            value={reading.pm1_0_raw}
            maxVal={200}
            color="#0ea5e9"
            spikeThreshold={null}
          />
          <PMBar
            label="PM2.5 (Fine particulate)"
            value={reading.pm2_5_raw}
            maxVal={250}
            color={pm25Driving ? '#f43f5e' : '#10b981'}
            spikeThreshold={60}
          />
          <PMBar
            label="PM2.5 Corrected"
            value={reading.pm2_5_corrected}
            maxVal={250}
            color="#10b981"
            spikeThreshold={null}
          />
          <PMBar
            label={`PM10 Raw${pm10Failed ? ' (SENSOR FAULT)' : ''}`}
            value={pm10Failed ? null : reading.pm10_raw}
            maxVal={430}
            color={pm10Driving ? '#f43f5e' : '#0284c7'}
            spikeThreshold={100}
          />
          <PMBar
            label="PM10 Corrected"
            value={reading.pm10_corrected}
            maxVal={430}
            color="#0284c7"
            spikeThreshold={null}
          />

          {(pm1Warming || pm1Below) && (
            <div className="text-[9.5px] text-sky-700 bg-sky-50 p-1.5 rounded-lg border border-sky-200 mt-2">
              ⓘ PM1.0 optical sensor in stabilization cycle
            </div>
          )}
        </div>

        {/* Right Column: 7-Channel Gas Matrix & Environmental Vitals */}
        <div className="bg-slate-50/60 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
              <span>7-CHANNEL GAS MATRIX</span>
              <Cpu size={12} className="text-slate-400" />
            </div>

            {/* Environmental Micro-Pills */}
            <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-white/70 border border-slate-200/60 text-xs">
              <div className="flex items-center gap-1">
                <Thermometer size={12} className="text-amber-500" />
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {reading.temperature_c?.toFixed(1) ?? '—'}°C
                </span>
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex items-center gap-1">
                <Droplets size={12} className={humidityGlitch ? 'text-purple-500' : 'text-blue-500'} />
                <span className={`font-mono font-bold text-[11px] ${humidityGlitch ? 'text-purple-700' : 'text-slate-800'}`}>
                  {reading.humidity_percent?.toFixed(1) ?? '—'}%
                </span>
              </div>
              {reading.battery_level != null && (
                <>
                  <div className="w-px h-3 bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <Battery size={12} className="text-emerald-500" />
                    <span className="font-mono font-bold text-slate-800 text-[11px]">
                      {reading.battery_level?.toFixed(0)}%
                    </span>
                  </div>
                </>
              )}
              {reading.is_solar_charging && (
                <div className="ml-auto flex items-center gap-1 text-[9px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                  <Sun size={10} className="text-amber-500 animate-spin" /> SOLAR
                </div>
              )}
            </div>

            {/* MQ Sensor Readouts */}
            {hasMQData ? (
              <div className="space-y-0.5">
                <MQRow label="MQ-2 (Combustion/Smoke)" value={reading.mq2} warningAbove={400} color="text-amber-600" />
                <MQRow label="MQ-4 (Methane Gas)" value={reading.mq4} warningAbove={350} color="text-orange-600" />
                <MQRow label="MQ-6 (LPG/Butane)" value={reading.mq6} warningAbove={350} color="text-orange-600" />
                <MQRow label="MQ-7 (Carbon Monoxide)" value={reading.mq7} warningAbove={300} color="text-rose-600" />
                <MQRow label="MQ-8 (Hydrogen)" value={reading.mq8} warningAbove={400} color="text-purple-600" />
                <MQRow label="MQ-131 (Oxidizing/Ozone)" value={reading.mq131} warningAbove={300} color="text-emerald-600" />
                <MQRow label="MQ-135 (Air Quality Index)" value={reading.mq135} warningAbove={400} color="text-blue-600" />
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 py-4 text-center font-mono">
                Analog gas matrix calibrating...
              </div>
            )}
          </div>

          {/* Sensor Trust Progress */}
          <div className="mt-2 pt-2 border-t border-slate-200/60">
            <div className="flex justify-between items-center text-[10px] font-mono mb-1">
              <span className="text-slate-500 font-medium">SENSOR NETWORK TRUST</span>
              <span className="font-extrabold text-emerald-700">{reading.sensor_trust_score || 100}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${reading.sensor_trust_score || 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quality Flags Ribbon */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <QualityFlagBadge flags={flags} />
      </div>
    </div>
  );
}
