import { Battery, Sun, AlertTriangle, CheckCircle, Wrench, Wifi, WifiOff, Activity } from 'lucide-react';

/**
 * Device Health Monitor
 *
 * HEALTH LOGIC (scored 0–100):
 *
 * 1. BATTERY SCORE (35pts):
 *    - battery_level >= 50%  →  35pts (Healthy)
 *    - battery_level >= 20%  →  20pts (Low)
 *    - battery_level >= 10%  →  10pts (Critical)
 *    - battery_level <  10%  →   0pts (Dead / Replace)
 *
 * 2. SOLAR CHARGING SCORE (20pts):
 *    - is_solar_charging = true  →  20pts (Panel OK)
 *    - is_solar_charging = false →   0pts (Panel Fault or Night)
 *
 * 3. SENSOR TRUST SCORE (30pts):
 *    - trust >= 80  →  30pts
 *    - trust >= 50  →  15pts
 *    - trust <  50  →   0pts (Sensor degraded)
 *
 * 4. DATA FRESHNESS (15pts):
 *    - Last reading < 5min ago  →  15pts (Online)
 *    - Last reading < 15min ago →   8pts (Delayed)
 *    - No data in 15min+        →   0pts (Offline)
 *
 * MAINTENANCE THRESHOLD: Overall score < 50 → "Needs Maintenance"
 * CRITICAL THRESHOLD:    Overall score < 25 → "CRITICAL - Immediate Action"
 */

function getBatteryScore(level) {
  if (level == null) return { score: 0, label: 'Unknown', color: '#6c757d' };
  if (level >= 50) return { score: 35, label: 'Healthy', color: '#198754' };
  if (level >= 20) return { score: 20, label: 'Low', color: '#ffc107' };
  if (level >= 10) return { score: 10, label: 'Critical', color: '#fd7e14' };
  return { score: 0, label: 'Dead — Replace', color: '#dc3545' };
}

function getSolarScore(charging) {
  if (charging == null) return { score: 0, label: 'Unknown', color: '#6c757d' };
  return charging
    ? { score: 20, label: 'Charging', color: '#198754' }
    : { score: 0, label: 'Panel Offline', color: '#dc3545' };
}

function getTrustScore(trust) {
  const t = trust ?? 100;
  if (t >= 80) return { score: 30, label: 'Good', color: '#198754' };
  if (t >= 50) return { score: 15, label: 'Degraded', color: '#ffc107' };
  return { score: 0, label: 'Faulty', color: '#dc3545' };
}

function getFreshnessScore(timestamp) {
  if (!timestamp) return { score: 0, label: 'Offline', color: '#dc3545', ageMin: null };
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageMin = Math.floor(ageMs / 60000);
  if (ageMs < 5 * 60 * 1000) return { score: 15, label: 'Live', color: '#198754', ageMin };
  if (ageMs < 15 * 60 * 1000) return { score: 8, label: 'Delayed', color: '#ffc107', ageMin };
  return { score: 0, label: 'Offline', color: '#dc3545', ageMin };
}

function MetricPill({ icon, label, value, color, subLabel }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 7, padding: '5px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.58rem', color: '#6c757d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.58rem', color: '#adb5bd', marginTop: 1 }}>{subLabel}</div>
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
    status = 'Healthy'; statusColor = '#198754'; statusBg = 'rgba(25,135,84,0.08)'; StatusIcon = CheckCircle;
  } else if (totalScore >= 50) {
    status = 'Monitor'; statusColor = '#ffc107'; statusBg = 'rgba(255,193,7,0.08)'; StatusIcon = AlertTriangle;
  } else if (totalScore >= 25) {
    status = 'Maintenance Needed'; statusColor = '#fd7e14'; statusBg = 'rgba(253,126,20,0.10)'; StatusIcon = Wrench;
  } else {
    status = 'CRITICAL'; statusColor = '#dc3545'; statusBg = 'rgba(220,53,69,0.12)'; StatusIcon = AlertTriangle;
  }

  const isOnline = fresh.score > 0;

  return (
    <div style={{ background: statusBg, border: `1px solid ${statusColor}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOnline ? <Wifi size={13} color="#198754" /> : <WifiOff size={13} color="#dc3545" />}
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#212529', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node?.name ?? 'Unknown Node'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <StatusIcon size={12} color={statusColor} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: statusColor }}>{status}</span>
          <span style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: 600, background: '#f0f2f5', borderRadius: 4, padding: '1px 5px' }}>{totalScore}/100</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        <MetricPill icon={<Battery size={10} />} label="Battery" value={`${reading?.battery_level?.toFixed(0) ?? '?'}%`} color={battery.color} subLabel={battery.label} />
        <MetricPill icon={<Sun size={10} />} label="Solar" value={reading?.is_solar_charging == null ? '?' : reading.is_solar_charging ? 'ON' : 'OFF'} color={solar.color} subLabel={solar.label} />
        <MetricPill icon={<Activity size={10} />} label="Trust" value={`${(reading?.sensor_trust_score ?? 100).toFixed(0)}%`} color={trust.color} subLabel={trust.label} />
        <MetricPill icon={<Wifi size={10} />} label="Signal" value={fresh.ageMin != null ? `${fresh.ageMin}m` : '—'} color={fresh.color} subLabel={fresh.label} />
      </div>
    </div>
  );
}

function SummaryChip({ count, label, color, pulse }) {
  return (
    <div style={{ flex: 1, background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 8, padding: '6px 10px', textAlign: 'center', position: 'relative' }}>
      {pulse && count > 0 && (
        <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 0 0 ${color}66` }} />
      )}
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: '0.6rem', color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

export default function DeviceHealthMonitor({ nodes, latestReadings }) {
  if (!nodes || nodes.length === 0) {
    return <div style={{ padding: 20, color: '#6c757d', fontSize: '0.8rem', textAlign: 'center' }}>No nodes to monitor.</div>;
  }

  const scored = nodes.map(node => {
    const reading = latestReadings?.[node.id];
    const b = getBatteryScore(reading?.battery_level).score;
    const s = getSolarScore(reading?.is_solar_charging).score;
    const t = getTrustScore(reading?.sensor_trust_score).score;
    const f = getFreshnessScore(reading?.timestamp).score;
    return { node, reading, totalScore: b + s + t + f };
  }).sort((a, b) => a.totalScore - b.totalScore);

  const criticalCount = scored.filter(s => s.totalScore < 25).length;
  const maintenanceCount = scored.filter(s => s.totalScore >= 25 && s.totalScore < 50).length;
  const healthyCount = scored.filter(s => s.totalScore >= 75).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <SummaryChip count={healthyCount} label="Healthy" color="#198754" />
        <SummaryChip count={maintenanceCount} label="Maintenance" color="#fd7e14" />
        <SummaryChip count={criticalCount} label="Critical" color="#dc3545" pulse={criticalCount > 0} />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
        {scored.map(({ node, reading }) => (
          <NodeHealthRow key={node.id} node={node} reading={reading} />
        ))}
      </div>
    </div>
  );
}
