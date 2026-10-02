import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Droplets, Factory, Flame } from 'lucide-react';

export default function ExternalSystems() {
  const [logs, setLogs] = useState({
    water_cannon: [],
    traffic_control: [],
    fire_control: [],
    industry_control: []
  });

  const fetchLogs = () => {
    fetch('http://localhost:8000/api/v1/external/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const sections = [
    { key: 'water_cannon', title: 'Water Cannon Management API', icon: <Droplets size={16} color="var(--oi)" /> },
    { key: 'traffic_control', title: 'Traffic Control API', icon: <Activity size={16} color="#f59e0b" /> },
    { key: 'fire_control', title: 'Fire Control API', icon: <Flame size={16} color="var(--ogd)" /> },
    { key: 'industry_control', title: 'Govt Industry Control', icon: <Factory size={16} color="#8b5cf6" /> },
  ];

  return (
    <div style={{ padding: '1.25rem' }}>
      <div className="osen-grid-2">
        {sections.map(section => (
          <div key={section.key} className="osen-card">
            <div className="osen-card-inner" style={{ padding: 0 }}>
              <div className="osen-card-header" style={{ padding: '0.85rem 1.25rem' }}>
                <span className="osen-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {section.icon} {section.title}
                </span>
                <span className="osen-badge osen-badge-success">Live API</span>
              </div>
              <div style={{ height: '300px', overflowY: 'auto', padding: '1rem', background: '#f8fafc' }}>
                {logs[section.key]?.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ts)' }}>
                    <ShieldAlert size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <span style={{ fontSize: '0.8rem' }}>No action data received yet.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs[section.key]?.map((log, idx) => (
                      <div key={idx} style={{
                        background: 'white',
                        border: '1px solid var(--be)',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        fontSize: '0.75rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        borderLeft: '3px solid var(--oi)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--ts)', fontSize: '0.7rem' }}>
                            {new Date(log.received_at).toLocaleTimeString()}
                          </span>
                          <span className="osen-badge" style={{ background: 'rgba(25,135,84,0.1)', color: 'var(--ogs)' }}>
                            {log.action}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                          <div style={{ color: 'var(--ts)' }}>Node ID:</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.node_id}</div>
                          
                          <div style={{ color: 'var(--ts)' }}>Source:</div>
                          <div style={{ color: '#f59e0b', fontWeight: 600 }}>{log.pollution_source}</div>
                          
                          <div style={{ color: 'var(--ts)' }}>AQI:</div>
                          <div style={{ color: 'var(--ogd)', fontWeight: 700 }}>{log.aqi}</div>
                        </div>
                        {log.mitigation_systems && log.mitigation_systems.length > 0 && (
                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--be)' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--ts)', marginBottom: 4 }}>Mitigation Systems:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {log.mitigation_systems.map((sys, i) => (
                                <span key={i} style={{ padding: '2px 6px', background: 'var(--ob)', borderRadius: 4, fontSize: '0.65rem', color: 'var(--tp)' }}>
                                  {sys.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
