import React, { useState, useEffect } from 'react';
import { Zap, Activity, Clock, Droplets, Gauge, ShieldCheck, AlertTriangle, TrendingDown } from 'lucide-react';

export default function ActionPropertiesCard({
  reading,
  selectedNode,
}) {
  const [activeSeconds, setActiveSeconds] = useState(0);

  const isRelayOn = !!reading?.relay_state;

  // Track active run time when relay is engaged
  useEffect(() => {
    let timer = null;
    if (isRelayOn) {
      timer = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setActiveSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRelayOn]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (!reading) {
    return (
      <div className="tech-card p-4 flex items-center justify-center min-h-[220px]">
        <span className="text-slate-400 font-mono text-xs">Waiting for telemetry...</span>
      </div>
    );
  }

  const isGoodAqi = (reading.aqi || 0) <= 50;
  const label = reading.classifier_label || 'unknown';
  const intensity = reading.intensity || 75;
  const durationMin = reading.duration_min || 3;

  // Dynamic engineering properties based on ML classifier
  let actionTitle = 'Mitigation Active';
  let properties = [];

  if (label === 'construction_dust') {
    actionTitle = 'Mist Cannon Actuated';
    const dynamicPressure = (80 + (intensity * 0.7)).toFixed(0);
    const dynamicFlow = ((intensity / 100) * 45).toFixed(1);
    const threshold = selectedNode?.pm10_threshold || 100;
    const diff = Math.max(0, (reading.pm10_corrected || 0) - threshold);
    const etaMins = Math.max(1, Math.round(diff / 0.5 / 60));

    properties = [
      { label: 'Operating Pressure', value: `${dynamicPressure} Bar`, icon: Gauge },
      { label: 'Mist Flow Rate', value: `${dynamicFlow} L/min`, icon: Droplets },
      { label: 'Suppression Rate', value: '~0.5 µg/m³/s', icon: TrendingDown },
      { label: 'Estimated Clearance', value: `~${etaMins} mins`, icon: Clock },
      { label: 'Power Draw', value: `${((intensity / 100) * 3.2).toFixed(1)} kW`, icon: Zap },
    ];
  } else if (label === 'vehicle_combustion') {
    const isSevere = (reading.aqi || 0) > 200;
    actionTitle = isSevere ? 'Traffic Re-routing (Heavy)' : 'Route Advisory Broadcast';
    properties = [
      { label: 'ITS Signal Phase', value: isSevere ? 'Red-Wave (Heavy Freight)' : 'Yellow-Wave Advisory', icon: Activity },
      { label: 'Detour Enforcement', value: `${intensity}% Diversion`, icon: ShieldCheck },
      { label: 'Estimated Clearance', value: `~${durationMin} mins`, icon: Clock },
      { label: 'Corridor Cordon', value: isSevere ? 'Radius: 1.2 km' : 'Radius: 500 m', icon: AlertTriangle },
    ];
  } else if (label === 'waste_burning') {
    const isSevere = (reading.aqi || 0) > 200;
    actionTitle = isSevere ? 'Multi-Unit Emergency Dispatch' : 'Fire Inspector Dispatched';
    properties = [
      { label: 'Dispatch Priority', value: isSevere ? `CRITICAL (${intensity}%)` : `ELEVATED (${intensity}%)`, icon: AlertTriangle },
      { label: 'Units Assigned', value: isSevere ? '2 Fire Engines + Patrol' : '1 Mobile Inspector', icon: ShieldCheck },
      { label: 'Estimated Response', value: `< ${durationMin} mins`, icon: Clock },
    ];
  } else {
    properties = [
      { label: 'Actuator Status', value: 'Engaged', icon: Zap },
      { label: 'Intervention Intensity', value: `${intensity}%`, icon: Gauge },
    ];
  }

  return (
    <div className="tech-card flex flex-col h-full bg-white border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="tech-card-header">
        <span className="tech-card-title">
          <span className={`tech-card-title-dot ${isRelayOn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          Actuation Telemetry & Properties
        </span>
        <span className={`tech-badge ${isRelayOn ? 'tech-badge-critical animate-pulse' : 'tech-badge-clean'}`}>
          {isRelayOn ? 'RELAY ENGAGED' : 'STANDBY'}
        </span>
      </div>

      <div className="tech-card-body flex-1 flex flex-col justify-between">
        {!isRelayOn ? (
          // Inactive / Standby state
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isGoodAqi ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
              <ShieldCheck size={24} />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              {isGoodAqi ? 'Air Quality Baseline Satisfied' : 'Remediation Armed (Standby)'}
            </div>
            <div className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
              {reading.action_reason || (isGoodAqi ? 'AQI is within permissible national air quality thresholds.' : 'Waiting for persistence confirmation or safety authorization.')}
            </div>
            <div className="mt-4 px-3 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600">
              CONTROL MODE: <span className="text-blue-700 font-bold">{selectedNode?.control_mode || 'AUTONOMOUS'}</span>
            </div>
          </div>
        ) : (
          // Active state
          <div>
            {/* Action Title & Running Session Pill */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                  TARGET: <span className="text-slate-900 font-bold">{label.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-sm font-extrabold text-rose-600 tracking-tight mt-0.5">
                  {actionTitle.toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500">SESSION RUNTIME</div>
                <div className="text-xs font-mono font-bold text-blue-700 flex items-center gap-1 justify-end">
                  <Clock size={12} />
                  <span>{formatTimer(activeSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Properties Matrix */}
            <div className="grid grid-cols-1 gap-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
              {properties.map((prop, idx) => {
                const Icon = prop.icon;
                return (
                  <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white transition-colors">
                    <div className="flex items-center gap-2">
                      <Icon size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium">{prop.label}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">{prop.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Water & Energy Ledger */}
            {label === 'construction_dust' && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono">EST. WATER FLOW</div>
                  <div className="text-xs font-mono font-bold text-blue-700 mt-0.5">
                    {((intensity / 100) * 45).toFixed(1)} L/min
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono">CYCLE ENERGY</div>
                  <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                    {((intensity / 100) * 0.05 * durationMin).toFixed(2)} kWh
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
