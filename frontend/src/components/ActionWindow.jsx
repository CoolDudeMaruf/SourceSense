import React, { useState } from 'react';
import ActionScene3D from './ActionScene3D';
import { Sparkles, Radio, ShieldAlert } from 'lucide-react';

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

  let actionTitle = 'Environmental Telemetry Active';
  let actuatorModel = 'Sensor Telemetry Standby';
  let badgeTheme = 'text-emerald-700 bg-emerald-50/90 border-emerald-200/90';

  if (isGoodAqi) {
    actionTitle = 'Monitoring — Air Quality Baseline Satisfied';
    actuatorModel = 'Actuator Disengaged (Standby)';
    badgeTheme = 'text-emerald-700 bg-emerald-50/90 border-emerald-200/90';
  } else if (!isActuallyOn) {
    actionTitle = 'Standby — Action Paused by Safety Gate';
    actuatorModel = 'Actuator Armed (Waiting Confirmation)';
    badgeTheme = 'text-amber-700 bg-amber-50/90 border-amber-200/90';
  } else if (activeLabel === 'construction_dust') {
    actionTitle = 'High-Pressure Fogger Actuated — Atomizing Mist';
    actuatorModel = 'Industrial Mist Cannon (Model SSC-450)';
    badgeTheme = 'text-blue-700 bg-blue-50/90 border-blue-200/90';
  } else if (activeLabel === 'vehicle_combustion') {
    actionTitle = aqi > 200 ? 'Traffic Re-routing Active (Heavy Diversion)' : 'Route Advisory Broadcast Active';
    actuatorModel = 'Urban ITS Gateway (Red-Wave Protocol)';
    badgeTheme = 'text-orange-700 bg-orange-50/90 border-orange-200/90';
  } else if (activeLabel === 'waste_burning') {
    actionTitle = aqi > 200 ? 'Multi-Unit Emergency Dispatch Triggered' : 'Local Fire Inspector Dispatched';
    actuatorModel = 'Emergency Response Beacon & Siren';
    badgeTheme = 'text-rose-700 bg-rose-50/90 border-rose-200/90';
  } else if (activeLabel === 'humid_haze') {
    actionTitle = 'Weather Inversion — Physical Suppression Inhibited';
    actuatorModel = 'Atmospheric Haze (Non-particulate)';
    badgeTheme = 'text-slate-600 bg-slate-100/90 border-slate-200/90';
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
    <div className="w-full h-full flex flex-col bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
      {/* Technical HUD Header */}
      <div className="p-3 bg-slate-50/70 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            {isActuallyOn && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isActuallyOn ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-emerald-500'
            }`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-extrabold text-slate-900 uppercase tracking-wide font-sans">
                {actuatorModel}
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${badgeTheme}`}>
                {isActuallyOn ? 'ACTUATOR ACTIVE' : 'GATE STANDBY'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium m-0 truncate max-w-[360px]">
              {actionTitle}
            </p>
          </div>
        </div>

        {/* Quick Operator Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPulse}
            disabled={testPulseActive}
            className={`tech-btn ${
              testPulseActive
                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                : 'tech-btn-primary'
            }`}
            title="Fire a 15-second diagnostic actuator pulse"
          >
            <Sparkles size={12} className={testPulseActive ? 'animate-spin' : ''} />
            <span>{testPulseActive ? `TEST PULSE (${pulseCountdown}s)` : 'TEST PULSE'}</span>
          </button>
        </div>
      </div>

      {/* AI Decision Rationale Bar */}
      {reason && (
        <div className="px-3.5 py-1.5 bg-slate-100/50 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between text-[10.5px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-700 truncate mr-2">
            <span className="text-blue-700 font-extrabold">RATIONALE:</span>
            <span className="text-slate-600 truncate">{reason}</span>
          </div>
          {confidence != null && (
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <span>CONF:</span>
              <span className="text-blue-700 font-bold">{(confidence * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* 3D Scene Viewport */}
      <div className="flex-1 w-full relative min-h-[350px] bg-gradient-to-b from-slate-100/60 to-slate-200/40">
        <ActionScene3D
          classifierLabel={activeLabel}
          isRelayOn={isActuallyOn}
          intensity={intensity}
        />

        {/* Tactical Crosshair / Corner Brackets Overlay */}
        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-slate-400/40 pointer-events-none" />
        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-slate-400/40 pointer-events-none" />
        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-slate-400/40 pointer-events-none" />
        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-slate-400/40 pointer-events-none" />

        {/* 3D Viewport Technical HUD Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5 z-10 font-mono text-[9.5px]">
          <div className="px-2 py-0.5 rounded-md bg-white/85 backdrop-blur-md border border-slate-200/80 text-slate-700 shadow-sm flex items-center gap-1.5">
            <Radio size={10} className="text-blue-600" />
            <span>DIGITAL TWIN: <strong className="text-blue-700">SIMULATION ACTIVE</strong></span>
          </div>
          {isActuallyOn && (
            <div className="px-2 py-0.5 rounded-md bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-800 shadow-sm flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              PHYSICAL EMISSION SUPPRESSION ENGAGED
            </div>
          )}
        </div>

        {/* Orbit Helper Prompt */}
        <div className="absolute bottom-2 right-3 pointer-events-none font-mono text-[9px] text-slate-500 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-200/80 shadow-sm">
          ROTATE: CLICK + DRAG | ZOOM: SCROLL
        </div>
      </div>
    </div>
  );
}
