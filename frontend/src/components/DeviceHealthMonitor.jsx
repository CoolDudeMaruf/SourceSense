import React from 'react';
import { Battery, Sun, AlertTriangle, CheckCircle, Wrench, Wifi, WifiOff, Activity } from 'lucide-react';

function getBatteryScore(level) {
  if (level == null) return { score: 0, label: 'Unknown', color: '#64748b' };
  if (level >= 50) return { score: 35, label: 'Healthy', color: '#16a34a' };
  if (level >= 20) return { score: 20, label: 'Low', color: '#d97706' };
  if (level >= 10) return { score: 10, label: 'Critical', color: '#ea580c' };
  return { score: 0, label: 'Dead — Replace', color: '#dc2626' };
}

function getSolarScore(charging) {
  if (charging == null) return { score: 0, label: 'Unknown', color: '#64748b' };
  return charging
    ? { score: 20, label: 'Charging', color: '#16a34a' }
    : { score: 0, label: 'Panel Offline', color: '#dc2626' };
}

function getTrustScore(trust) {
  const t = trust ?? 100;
  if (t >= 80) return { score: 30, label: 'Good', color: '#16a34a' };
  if (t >= 50) return { score: 15, label: 'Degraded', color: '#d97706' };
  return { score: 0, label: 'Faulty', color: '#dc2626' };
}

function getFreshnessScore(timestamp) {
  if (!timestamp) return { score: 0, label: 'Offline', color: '#dc2626', ageMin: null };
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageMin = Math.floor(ageMs / 60000);
  if (ageMs < 5 * 60 * 1000) return { score: 15, label: 'Live', color: '#16a34a', ageMin };
  if (ageMs < 15 * 60 * 1000) return { score: 8, label: 'Delayed', color: '#d97706', ageMin };
  return { score: 0, label: 'Offline', color: '#dc2626', ageMin };
}

function MetricPill({ icon, label, value, color, subLabel }) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-2 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">{label}</span>
      </div>
      <div className="text-xs font-extrabold font-mono" style={{ color }}>{value}</div>
      <div className="text-[9.5px] text-slate-400 font-medium truncate mt-0.5">{subLabel}</div>
    </div>
  );
}

function NodeHealthRow({ node, reading }) {
  const battery = getBatteryScore(reading?.battery_level);
  const solar = getSolarScore(reading?.is_solar_charging);
  const trust = getTrustScore(reading?.sensor_trust_score);
  const fresh = getFreshnessScore(reading?.timestamp);
  const totalScore = battery.score + solar.score + trust.score + fresh.score;

  let status, statusColor, statusBg, StatusIcon;
  if (totalScore >= 75) {
    status = 'Healthy'; statusColor = '#16a34a'; statusBg = 'bg-emerald-50/70 border-emerald-200/80'; StatusIcon = CheckCircle;
  } else if (totalScore >= 50) {
    status = 'Monitor'; statusColor = '#d97706'; statusBg = 'bg-amber-50/70 border-amber-200/80'; StatusIcon = AlertTriangle;
  } else if (totalScore >= 25) {
    status = 'Maintenance Needed'; statusColor = '#ea580c'; statusBg = 'bg-orange-50/70 border-orange-200/80'; StatusIcon = Wrench;
  } else {
    status = 'CRITICAL'; statusColor = '#dc2626'; statusBg = 'bg-rose-50/70 border-rose-200/80'; StatusIcon = AlertTriangle;
  }

  const isOnline = fresh.score > 0;

  return (
    <div className={`backdrop-blur-md border rounded-2xl p-3.5 mb-2.5 transition-all duration-200 ${statusBg}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} className="text-rose-600" />}
          <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
            {node?.name ?? 'Unknown Node'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-extrabold font-mono" style={{ color: statusColor }}>
            <StatusIcon size={12} />
            {status}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/80 shadow-sm">
            {totalScore}/100 PTS
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricPill icon={<Battery size={11} />} label="Battery" value={`${reading?.battery_level?.toFixed(0) ?? '?'}%`} color={battery.color} subLabel={battery.label} />
        <MetricPill icon={<Sun size={11} />} label="Solar" value={reading?.is_solar_charging == null ? '?' : reading.is_solar_charging ? 'ON' : 'OFF'} color={solar.color} subLabel={solar.label} />
        <MetricPill icon={<Activity size={11} />} label="Trust" value={`${(reading?.sensor_trust_score ?? 100).toFixed(0)}%`} color={trust.color} subLabel={trust.label} />
        <MetricPill icon={<Wifi size={11} />} label="Signal" value={fresh.ageMin != null ? `${fresh.ageMin}m ago` : 'Offline'} color={fresh.color} subLabel={fresh.label} />
      </div>
    </div>
  );
}

function SummaryChip({ count, label, color, pulse }) {
  return (
    <div className="flex-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 text-center relative shadow-sm">
      {pulse && count > 0 && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
      )}
      <div className="text-xl font-extrabold font-mono" style={{ color }}>{count}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>{label}</div>
    </div>
  );
}

export default function DeviceHealthMonitor({ nodes, latestReadings }) {
  if (!nodes || nodes.length === 0) {
    return <div className="p-8 text-slate-400 font-mono text-xs text-center">No nodes configured for SCADA monitoring.</div>;
  }

  const scored = nodes.map((node) => {
    const reading = latestReadings?.[node.id];
    const b = getBatteryScore(reading?.battery_level).score;
    const s = getSolarScore(reading?.is_solar_charging).score;
    const t = getTrustScore(reading?.sensor_trust_score).score;
    const f = getFreshnessScore(reading?.timestamp).score;
    return { node, reading, totalScore: b + s + t + f };
  }).sort((a, b) => a.totalScore - b.totalScore);

  const criticalCount = scored.filter((s) => s.totalScore < 25).length;
  const maintenanceCount = scored.filter((s) => s.totalScore >= 25 && s.totalScore < 50).length;
  const healthyCount = scored.filter((s) => s.totalScore >= 75).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 mb-3">
        <SummaryChip count={healthyCount} label="Healthy Nodes" color="#16a34a" />
        <SummaryChip count={maintenanceCount} label="Needs Maintenance" color="#ea580c" />
        <SummaryChip count={criticalCount} label="Critical Alerts" color="#dc2626" pulse={criticalCount > 0} />
      </div>

      <div className="max-h-[460px] overflow-y-auto pr-1 space-y-1">
        {scored.map(({ node, reading }) => (
          <NodeHealthRow key={node.id} node={node} reading={reading} />
        ))}
      </div>
    </div>
  );
}
