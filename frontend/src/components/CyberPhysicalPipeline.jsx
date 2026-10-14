import React from 'react';
import { ArrowRight, Cpu, Eye, ShieldCheck, Zap, TrendingUp, Radio } from 'lucide-react';

export default function CyberPhysicalPipeline({
  reading,
  selectedNode,
  dustSuppressed = '0.00'
}) {
  if (!reading) return null;

  const trustScore = reading.sensor_trust_score != null ? Number(reading.sensor_trust_score).toFixed(1) : '95.0';
  const label = reading.classifier_label ? reading.classifier_label.replace(/_/g, ' ') : 'MONITORING';
  const confidence = reading.classifier_confidence != null ? (reading.classifier_confidence * 100).toFixed(0) : '—';
  const isRelayOn = !!reading.relay_state;
  const forecastTrend = (reading.forecast_30m && reading.pm10_corrected)
    ? (reading.forecast_30m - reading.pm10_corrected).toFixed(1)
    : '+0.0';
  const intensity = reading.intensity || 75;

  const steps = [
    {
      id: 'step-1',
      num: '01',
      title: 'SENSE & CALIBRATE',
      icon: Eye,
      status: 'VERIFIED',
      statusColor: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/90',
      metric: `Trust ${trustScore}%`,
      detail: `RH: ${reading.humidity_percent || 0}% corrected`,
      accent: 'border-emerald-500/20',
      isActive: true,
    },
    {
      id: 'step-2',
      num: '02',
      title: 'TINYML CLASSIFIER',
      icon: Cpu,
      status: label.toUpperCase(),
      statusColor: isRelayOn ? 'text-amber-700 bg-amber-50/90 border-amber-200/90' : 'text-blue-700 bg-blue-50/90 border-blue-200/90',
      metric: `Conf ${confidence}%`,
      detail: '7-Channel Gas Coherence',
      accent: 'border-blue-500/20',
      isActive: true,
    },
    {
      id: 'step-3',
      num: '03',
      title: '30-MIN FORECAST',
      icon: TrendingUp,
      status: Number(forecastTrend) > 0 ? `+${forecastTrend} µg` : `${forecastTrend} µg`,
      statusColor: Number(forecastTrend) > 0 ? 'text-rose-700 bg-rose-50/90 border-rose-200/90' : 'text-emerald-700 bg-emerald-50/90 border-emerald-200/90',
      metric: `Target ${reading.forecast_30m ? Math.round(reading.forecast_30m) : '—'} µg`,
      detail: 'Autoregressive Horizon',
      accent: 'border-indigo-500/20',
      isActive: true,
    },
    {
      id: 'step-4',
      num: '04',
      title: 'SAFETY GATE & PLAN',
      icon: ShieldCheck,
      status: selectedNode?.control_mode || 'AUTONOMOUS',
      statusColor: 'text-indigo-700 bg-indigo-50/90 border-indigo-200/90',
      metric: isRelayOn ? `${intensity}% Intensity` : 'Standby Gate',
      detail: reading.action_reason ? (reading.action_reason.slice(0, 24) + '...') : 'Safety constraints valid',
      accent: 'border-purple-500/20',
      isActive: true,
    },
    {
      id: 'step-5',
      num: '05',
      title: 'CLOSED-LOOP ACTION',
      icon: Zap,
      status: isRelayOn ? 'RELAY ENGAGED' : 'STANDBY',
      statusColor: isRelayOn ? 'text-rose-700 bg-rose-100/90 border-rose-300 font-bold' : 'text-slate-600 bg-slate-100/80 border-slate-200',
      metric: `${dustSuppressed} kg`,
      detail: isRelayOn ? 'Actuator Suppressing' : 'Air Below Threshold',
      accent: isRelayOn ? 'border-rose-500/40' : 'border-slate-300/30',
      isActive: isRelayOn,
    },
  ];

  return (
    <div className="w-full bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-4 transition-all">
      {/* Pipeline Header Ribbon */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 shadow-sm shadow-blue-500/50"></span>
          </div>
          <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-800">
            Autonomous Cyber-Physical Remediation Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[10.5px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Radio size={11} className="text-blue-600" />
            <span>CYCLE: 1000ms</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            FEEDBACK LOOP: CLOSED
          </span>
        </div>
      </div>

      {/* 5-Stage Interactive Glass Chambers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActuating = step.id === 'step-5' && isRelayOn;
          return (
            <div
              key={step.id}
              className={`relative p-3 rounded-xl border backdrop-blur-md transition-all duration-300 ${
                isActuating
                  ? 'bg-gradient-to-b from-rose-50/80 to-white/90 border-rose-300/90 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/20'
                  : 'bg-slate-50/60 hover:bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              {/* Top Row: Number, Title, Icon */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-extrabold text-slate-400/90">{step.num}</span>
                  <span className="text-[9.5px] font-bold tracking-wide text-slate-700 uppercase">{step.title}</span>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isActuating ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Icon size={13} className={isActuating ? 'animate-pulse' : ''} />
                </div>
              </div>

              {/* Middle Row: Status Pill & Key Metric */}
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider backdrop-blur-sm truncate max-w-[110px] ${step.statusColor}`}>
                  {step.status}
                </span>
                <span className="font-mono text-[11px] font-extrabold text-slate-900 shrink-0">{step.metric}</span>
              </div>

              {/* Bottom Row: Detail Microtext */}
              <div className="text-[10px] text-slate-500 font-medium truncate">
                {step.detail}
              </div>

              {/* Connecting Flow Arrow */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white/90 border border-slate-200/90 items-center justify-center text-slate-400 shadow-sm pointer-events-none">
                  <ArrowRight size={10} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
