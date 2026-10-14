import { Power, Droplets } from 'lucide-react';

/**
 * RelayStatus – shows relay ON/OFF with pulsing animation when ON.
 */
export default function RelayStatus({ isOn, nodeId }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isOn ? 'relay-on' : ''}`}
        style={{
          background: isOn
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)'
            : 'radial-gradient(circle, rgba(226, 232, 240, 0.8) 0%, rgba(241, 245, 249, 0.4) 100%)',
          border: `2px solid ${isOn ? 'rgba(239, 68, 68, 0.8)' : 'rgba(203, 213, 225, 0.8)'}`,
          boxShadow: isOn ? '0 0 20px rgba(239, 68, 68, 0.35)' : 'none',
        }}
      >
        {isOn ? (
          <Droplets size={24} className="text-red-500 animate-bounce" />
        ) : (
          <Power size={22} className="text-slate-400" />
        )}
      </div>
      <div className="text-center">
        <div
          className="font-mono font-bold text-xs tracking-widest uppercase"
          style={{ color: isOn ? '#ef4444' : '#64748b' }}
        >
          {isOn ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 500 }}>
          Mist Suppression Loop
        </div>
      </div>
    </div>
  );
}
