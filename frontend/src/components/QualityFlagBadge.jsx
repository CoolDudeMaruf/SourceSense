import { AlertTriangle, Zap, Droplets, Clock, CheckCircle, Wind } from 'lucide-react';

const FLAG_CONFIG = {
  failed_read:      { label: 'Failed Read',      cls: 'flag-failed',  Icon: Zap },
  below_detection:  { label: 'Below Detection',  cls: 'flag-below',   Icon: Wind },
  possible_warmup:  { label: 'Warming Up',        cls: 'flag-warmup',  Icon: Clock },
  sensor_glitch:    { label: 'Sensor Glitch',    cls: 'flag-glitch',  Icon: AlertTriangle },
  logging_gap:      { label: 'Data Gap',          cls: 'flag-gap',     Icon: Clock },
};

/**
 * QualityFlagBadge – renders quality flag chip(s) for a reading's quality_flags dict.
 *
 * Supports:
 *  flags = { pm10: "failed_read", humidity: "sensor_glitch", mq131: "failed_read" }
 *
 * If no flags → renders a clean "Good Data" chip.
 */
export default function QualityFlagBadge({ flags = {}, compact = false }) {
  const entries = Object.entries(flags).filter(([k]) => k !== 'gap_minutes');

  if (entries.length === 0) {
    return (
      <span className="flag-chip flag-clean">
        <CheckCircle size={10} />
        Good Data
      </span>
    );
  }

  // Deduplicate flag types (e.g. multiple channels with failed_read)
  const uniqueFlags = {};
  for (const [channel, flagType] of entries) {
    if (!uniqueFlags[flagType]) uniqueFlags[flagType] = [];
    uniqueFlags[flagType].push(channel);
  }

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(uniqueFlags).map(([flagType, channels]) => {
        const cfg = FLAG_CONFIG[flagType] || { label: flagType, cls: 'flag-failed', Icon: AlertTriangle };
        const { Icon } = cfg;
        const channelStr = channels.length > 0 && !compact
          ? ` (${channels.join(', ')})`
          : '';
        return (
          <span key={flagType} className={`flag-chip ${cfg.cls}`}>
            <Icon size={10} />
            {cfg.label}{channelStr}
          </span>
        );
      })}
      {flags.gap_minutes && (
        <span className="flag-chip flag-gap" style={{ fontSize: '0.62rem' }}>
          +{flags.gap_minutes}m gap
        </span>
      )}
    </div>
  );
}
