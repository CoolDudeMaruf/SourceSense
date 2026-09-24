import React from 'react';
import ActionScene3D from './ActionScene3D';

export default function ActionWindow({ classifierLabel, isRelayOn, confidence, reason }) {
  let actionText = "Monitoring environment...";
  let color = "#4ade80";

  if (classifierLabel === "construction_dust") {
    actionText = "Sprinkling Water Mist";
    color = "#38bdf8";
  } else if (classifierLabel === "vehicle_combustion") {
    actionText = "Issuing Traffic Advisory";
    color = "#f97316";
  } else if (classifierLabel === "waste_burning") {
    actionText = "Dispatching Fire Control";
    color = "#ef4444";
  } else if (classifierLabel === "humid_haze") {
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
        
        {/* AI Confidence & Reason */}
        <div className="flex flex-col items-center mt-2 w-full px-2">
          {confidence && (
            <div className="flex justify-between w-full mb-1">
               <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI CONFIDENCE</span>
               <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{(confidence * 100).toFixed(1)}%</span>
            </div>
          )}
          {reason && (
             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, width: '100%' }}>
               {reason}
             </div>
          )}
        </div>
      </div>
      
      {/* 3D Canvas Container */}
      <div className="flex-1 w-full mt-2" style={{ minHeight: 180 }}>
        {/* We pass true for isRelayOn so the 3D preview always shows the action in motion! */}
        <ActionScene3D classifierLabel={classifierLabel} isRelayOn={true} />
      </div>
    </div>
  );
}
