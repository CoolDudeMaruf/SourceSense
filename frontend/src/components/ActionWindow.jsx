import React, { useState } from 'react';
import ActionScene3D from './ActionScene3D';
import { Sparkles } from 'lucide-react';

export default function ActionWindow({
  classifierLabel,
  isRelayOn,
  confidence,
  reason,
  isGoodAqi,
  aqi = 0,
  intensity = 75,
  onTriggerTestPulse,
}) {
  const [testPulseActive, setTestPulseActive] = useState(false);
  const [pulseCountdown, setPulseCountdown] = useState(0);

  const activeLabel = isGoodAqi ? 'clean' : classifierLabel;
  const isActuallyOn = isRelayOn || testPulseActive;

  let actionTitle = 'Environmental Monitoring Active';
  let actuatorModel = 'Sensor Telemetry Standby';
  let badgeTheme = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (isGoodAqi) {
    actionTitle = 'Monitoring — Air Quality Baseline Satisfied';
    actuatorModel = 'Actuator Disengaged (Standby)';
    badgeTheme = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (!isActuallyOn) {
    actionTitle = 'Standby — Action Paused by Safety Gate';
    actuatorModel = 'Actuator Armed (Waiting Confirmation)';
    badgeTheme = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (activeLabel === 'construction_dust') {
    actionTitle = 'High-Pressure Fogger Actuated — Atomizing Mist';
    actuatorModel = 'Industrial Mist Cannon (Model SSC-450)';
    badgeTheme = 'text-blue-700 bg-blue-50 border-blue-200';
  } else if (activeLabel === 'vehicle_combustion') {
    actionTitle = aqi > 200 ? 'Traffic Re-routing Active (Heavy Diversion)' : 'Route Advisory Broadcast Active';
    actuatorModel = 'Urban ITS Gateway (Red-Wave Protocol)';
    badgeTheme = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (activeLabel === 'waste_burning') {
    actionTitle = aqi > 200 ? 'Multi-Unit Emergency Dispatch Triggered' : 'Local Fire Inspector Dispatched';
    actuatorModel = 'Emergency Response Beacon & Siren';
    badgeTheme = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (activeLabel === 'humid_haze') {
    actionTitle = 'Weather Inversion — Physical Suppression Inhibited';
    actuatorModel = 'Atmospheric Haze (Non-particulate)';
    badgeTheme = 'text-slate-600 bg-slate-100 border-slate-200';
  }

  const handleTestPulse = () => {
    if (testPulseActive) return;
    setTestPulseActive(true);
    setPulseCountdown(15);
    if (onTriggerTestPulse) onTriggerTestPulse();

    const interval = setInterval(() => {
      setPulseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTestPulseActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Technical HUD Header */}
      <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${isActuallyOn ? 'bg-rose-500 shadow-[0_0_8px_#ef4444] animate-pulse' : 'bg-emerald-500'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-900 uppercase tracking-wide">
                {actuatorModel}
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeTheme}`}>
                {isActuallyOn ? 'ACTUATOR ACTIVE' : 'GATE STANDBY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium m-0 truncate max-w-[360px]">
              {actionTitle}
            </p>
          </div>
        </div>

        {/* Quick Operator Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPulse}
            disabled={testPulseActive}
            className={`tech-btn ${testPulseActive ? 'bg-blue-50 text-blue-700 border-blue-300' : 'tech-btn-primary'}`}
            title="Fire a 15-second diagnostic actuator pulse"
          >
            <Sparkles size={12} className={testPulseActive ? 'animate-spin' : ''} />
            <span>{testPulseActive ? `TEST PULSE (${pulseCountdown}s)` : 'TEST PULSE'}</span>
          </button>
        </div>
      </div>

      {/* AI Decision Rationale Bar */}
      {reason && (
        <div className="px-3.5 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-700 truncate mr-2">
            <span className="text-blue-700 font-bold">RATIONALE:</span>
            <span className="text-slate-600 truncate">{reason}</span>
          </div>
          {confidence != null && (
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <span>CONFIDENCE:</span>
              <span className="text-blue-700 font-bold">{(confidence * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* 3D Scene Viewport */}
      <div className="flex-1 w-full relative min-h-[360px] bg-slate-50">
        <ActionScene3D
          classifierLabel={activeLabel}
          isRelayOn={isActuallyOn}
          intensity={intensity}
        />

        {/* 3D Viewport Technical HUD Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 z-10 font-mono text-[10px]">
          <div className="px-2 py-0.5 rounded bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 shadow-sm">
            DIGITAL TWIN: <span className="text-blue-700 font-bold">SIMULATION ACTIVE</span>
          </div>
          {isActuallyOn && (
            <div className="px-2 py-0.5 rounded bg-rose-50/95 backdrop-blur-md border border-rose-200 text-rose-800 shadow-sm flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              PHYSICAL EMISSION SUPPRESSION ENGAGED
            </div>
          )}
        </div>

        {/* Orbit Helper Prompt */}
        <div className="absolute bottom-2 right-3 pointer-events-none font-mono text-[9px] text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200 shadow-sm">
          ROTATE: CLICK + DRAG | ZOOM: SCROLL
        </div>
      </div>
    </div>
  );
}
