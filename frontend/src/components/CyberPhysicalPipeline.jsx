import React from 'react';
import { ArrowRight, Cpu, Eye, ShieldCheck, Zap, TrendingUp } from 'lucide-react';

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
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      metric: `Trust: ${trustScore}%`,
      detail: `RH: ${reading.humidity_percent || 0}% corrected`,
      isActive: true,
    },
    {
      id: 'step-2',
      num: '02',
      title: 'TINYML CLASSIFIER',
      icon: Cpu,
      status: label.toUpperCase(),
      statusColor: isRelayOn ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200',
      metric: `Conf: ${confidence}%`,
      detail: '7-Channel Gas Coherence',
      isActive: true,
    },
    {
      id: 'step-3',
      num: '03',
      title: '30-MIN FORECAST',
      icon: TrendingUp,
      status: Number(forecastTrend) > 0 ? `+${forecastTrend} µg` : `${forecastTrend} µg`,
      statusColor: Number(forecastTrend) > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      metric: `Target: ${reading.forecast_30m ? Math.round(reading.forecast_30m) : '—'} µg/m³`,
      detail: 'Autoregressive Horizon',
      isActive: true,
    },
    {
      id: 'step-4',
      num: '04',
      title: 'SAFETY GATE & PLAN',
      icon: ShieldCheck,
      status: selectedNode?.control_mode || 'AUTONOMOUS',
      statusColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      metric: isRelayOn ? `${intensity}% Intensity` : 'Standby Gate',
      detail: reading.action_reason ? (reading.action_reason.slice(0, 26) + '...') : 'Safety constraints valid',
      isActive: true,
    },
    {
      id: 'step-5',
      num: '05',
      title: 'CLOSED-LOOP ACTION',
      icon: Zap,
      status: isRelayOn ? 'RELAY ENGAGED' : 'STANDBY',
      statusColor: isRelayOn ? 'text-rose-700 bg-rose-100 border-rose-300 font-bold' : 'text-slate-600 bg-slate-100 border-slate-200',
      metric: `${dustSuppressed} kg Extracted`,
      detail: isRelayOn ? 'Actuator Suppressing' : 'Air Below Threshold',
      isActive: isRelayOn,
    },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_6px_#2563eb]"></span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
            Automated Closed-Loop Remediation Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
          <span>CYCLE: 1000ms</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600 font-semibold">FEEDBACK LOOP: CLOSED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`relative p-3 rounded-lg border transition-all ${
                step.isActive && step.id === 'step-5' && isRelayOn
                  ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                  : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-slate-400">{step.num}</span>
                  <span className="text-[10px] font-bold tracking-wide text-slate-700 uppercase">{step.title}</span>
                </div>
                <Icon size={14} className={step.isActive && isRelayOn && step.id === 'step-5' ? 'text-rose-600' : 'text-blue-600'} />
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${step.statusColor}`}>
                  {step.status}
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-900">{step.metric}</span>
              </div>

              <div className="text-[10px] text-slate-500 font-medium truncate">
                {step.detail}
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-300 pointer-events-none">
                  <ArrowRight size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
