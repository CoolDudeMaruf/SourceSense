import { Power, Droplets } from 'lucide-react';

/**
 * RelayStatus – shows relay ON/OFF with pulsing animation when ON.
 */
export default function RelayStatus({ isOn, nodeId }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${isOn ? 'relay-on' : ''}`}
        style={{
          background: isOn
            ? 'linear-gradient(135deg, #ef444433, #ef444411)'
            : 'linear-gradient(135deg, #1e2d4555, #1e2d4522)',
          border: `2px solid ${isOn ? '#ef4444' : '#1e2d45'}`,
        }}
      >
        {isOn ? (
          <Droplets size={24} color="#ef4444" />
        ) : (
          <Power size={22} color="#4a5876" />
        )}
      </div>
      <div className="text-center">
        <div
          className="font-bold text-sm tracking-widest uppercase"
          style={{ color: isOn ? '#ef4444' : '#4a5876' }}
        >
          {isOn ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
          Mist Suppression
        </div>
      </div>
    </div>
  );
}
