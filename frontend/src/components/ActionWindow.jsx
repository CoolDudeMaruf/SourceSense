import React from 'react';
import ActionScene3D from './ActionScene3D';

export default function ActionWindow({ classifierLabel, isRelayOn, confidence, reason, isGoodAqi, aqi = 0 }) {
  let actionText = "Monitoring environment...";
  let color = "#4ade80";
  let activeLabel = isGoodAqi ? "clean" : classifierLabel;
  let actionPrefix = aqi > 200 ? "Heavy Action Needed" : "Light Action Needed";

  if (isGoodAqi) {
    actionText = "Monitoring. Good AQI. No action needed.";
  } else if (!isRelayOn) {
    actionText = "Standby (Action Paused)";
    color = "#facc15";
  } else if (activeLabel === "construction_dust") {
    actionText = `${actionPrefix}: Sprinkling Water Mist`;
    color = "#38bdf8";
  } else if (activeLabel === "vehicle_combustion") {
    actionText = aqi > 200 
      ? `${actionPrefix}: Issuing Heavy Diversion`
      : `${actionPrefix}: Issuing Route Advisory`;
    color = "#f97316";
  } else if (activeLabel === "waste_burning") {
    actionText = aqi > 200
      ? `${actionPrefix}: Multi-Unit Dispatch`
      : `${actionPrefix}: Local Fire Inspector`;
    color = "#ef4444";
  } else if (activeLabel === "humid_haze") {
    actionText = "No Action (Weather Event)";
    color = "#94a3b8";
  }

  return (
    <div className="glass-card p-0 flex flex-col flex-1" style={{ position: 'relative', overflow: 'hidden', height: 500 }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, background: `radial-gradient(circle, ${color}33 0%, rgba(0,0,0,0) 70%)`, borderRadius: '50%' }} />
      
      {/* Text Header */}
      <div className="p-4 pb-0 flex flex-col items-center">
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          System Action
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
          {actionText}
        </div>
        
        {/* AI Confidence & Reason (Hidden during Good AQI) */}
        {!isGoodAqi && (
          <div className="flex flex-col items-center mt-2 w-full px-2">
            {confidence != null && (
              <div className="flex justify-between w-full mb-1">
                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI CONFIDENCE</span>
                 <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{(confidence * 100).toFixed(1)}%</span>
              </div>
            )}
            {reason && (
               <div style={{
                 fontSize: '0.75rem',
                 color: !isRelayOn ? '#854d0e' : 'var(--text-secondary)',
                 textAlign: 'center',
                 background: !isRelayOn ? 'rgba(250, 204, 21, 0.15)' : 'rgba(255,255,255,0.05)',
                 border: !isRelayOn ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                 padding: '5px 10px',
                 borderRadius: 6,
                 width: '100%',
                 marginTop: 4,
                 fontWeight: 600
               }}>
                 {!isRelayOn ? <span><strong>Reason:</strong> {reason}</span> : reason}
               </div>
            )}
          </div>
        )}
      </div>
      
      {/* 3D Canvas Container */}
      <div className="flex-1 w-full mt-2" style={{ minHeight: 180 }}>
        {/* We pass the actual isRelayOn state to control the 3D animation */}
        <ActionScene3D classifierLabel={activeLabel} isRelayOn={isRelayOn} />
      </div>
    </div>
  );
}
