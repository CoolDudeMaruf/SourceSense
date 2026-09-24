import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Wifi, WifiOff, Download, Activity } from 'lucide-react';
import QualityFlagBadge from '../components/QualityFlagBadge';
import NodeMap from '../components/NodeMap';
import LiveReadingsCard from '../components/LiveReadingsCard';
import AQIBadge from '../components/AQIBadge';
import RelayStatus from '../components/RelayStatus';
import ActionWindow from '../components/ActionWindow';
import TimelineChart from '../components/TimelineChart';
import DataQualityPanel from '../components/DataQualityPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import { exportReadingsToCSV } from '../utils/csvExport';

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [readings, setReadings] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [prevReadings, setPrevReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live'); // 'live' | 'quality'

  const { lastReading, connected } = useWebSocket(selectedNodeId);

  // Load nodes on mount
  useEffect(() => {
    api.getNodes()
      .then(data => {
        const nodeList = Array.isArray(data) ? data : [];
        setNodes(nodeList);
        if (nodeList.length > 0) setSelectedNodeId(nodeList[0].id);
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, []);

  // Load readings when node changes
  const loadReadings = useCallback(() => {
    // 1. Fetch exactly 1 latest reading for EACH active node on the map
    if (nodes.length > 0) {
      Promise.all(nodes.map(n => api.getReadings(n.id, 1).then(res => res[0])))
        .then(results => {
          const latestMap = {};
          results.forEach(r => {
            if (r && r.node_id) latestMap[r.node_id] = r;
          });
          setLatestReadings(prev => ({ ...latestMap, ...prev }));
        })
        .catch(() => {});
    }

    // 2. Fetch history specifically for the selected node for the timeline chart
    if (!selectedNodeId) return;
    api.getReadings(selectedNodeId, 100).then(data => {
      const list = Array.isArray(data) ? data : [];
      setReadings(list);
      if (list.length > 0) {
        setLatestReadings(prev => ({ ...prev, [selectedNodeId]: list[0] }));
      }
    }).catch(() => {});
  }, [selectedNodeId, nodes]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  // Inject WebSocket live readings into state
  useEffect(() => {
    if (!lastReading) return;
    setLatestReadings(prev => {
      const old = prev[lastReading.node_id];
      if (old) setPrevReadings(p => ({ ...p, [lastReading.node_id]: old }));
      return { ...prev, [lastReading.node_id]: lastReading };
    });
    setReadings(prev => {
      const exists = prev.some(r => r.id === lastReading.id);
      if (exists) return prev.map(r => r.id === lastReading.id ? lastReading : r);
      return [lastReading, ...prev].slice(0, 200);
    });
  }, [lastReading]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const currentReading = latestReadings[selectedNodeId];
  const prevReading = prevReadings[selectedNodeId];

  // Calculate Impact Metric: Dust Suppressed (kg) based on PM10 drops during relay ON
  const dustSuppressedKg = useMemo(() => {
    if (!readings || readings.length === 0) return "0.00";
    let suppressed = 0;
    // Sort ascending by time
    const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.relay_state && curr.pm10_corrected < prev.pm10_corrected) {
        // Delta PM10 * volume factor (abstracted to 0.005 for kg equivalent visualization)
        suppressed += (prev.pm10_corrected - curr.pm10_corrected) * 0.005;
      }
    }
    return suppressed.toFixed(2);
  }, [readings]);

  const classifierColors = {
    construction_dust:  '#fbbf24',
    vehicle_combustion: '#f97316',
    waste_burning:      '#ef4444',
    humid_haze:         '#38bdf8',
    clean:              '#4ade80',
  };

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Live Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0' }}>
            Mumbai Pilot — Sense → Understand → Act
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* WS status */}
          <div className="flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
            {connected
              ? <><Wifi size={13} color="#4ade80" /><span style={{ color: '#4ade80' }}>Live</span></>
              : <><WifiOff size={13} color="#f87171" /><span style={{ color: '#f87171' }}>Disconnected</span></>
            }
          </div>
          <button className="btn-ghost flex items-center gap-1.5" onClick={loadReadings}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => exportReadingsToCSV(readings, `sourcesense_node${selectedNodeId}.csv`)}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Node selector and System Mode */}
      {nodes.length > 0 && (
        <div className="flex gap-4 mb-5 flex-wrap items-center w-full">
          <div className="flex gap-2 flex-wrap w-full md:w-auto flex-1">
            {nodes.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedNodeId(n.id)}
                className={`btn-ghost ${selectedNodeId === n.id ? 'active' : ''}`}
                style={{
                  borderColor: selectedNodeId === n.id ? 'var(--brand-500)' : undefined,
                  color: selectedNodeId === n.id ? 'var(--brand-400)' : undefined,
                  fontSize: '0.75rem', 
                  padding: '4px 10px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Activity size={12} style={{ display: 'inline', marginRight: 6 }} />
                {n.name}
              </button>
            ))}
          </div>
          {/* AI Mode Selector */}
          <div className="flex items-center gap-2 ml-auto p-1 rounded-md" style={{ background: 'var(--bg-secondary)' }}>
             <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>AI MODE:</span>
             {['MANUAL', 'SIMULATION', 'AUTONOMOUS'].map(mode => (
               <button
                 key={mode}
                 style={{
                   padding: '4px 12px',
                   fontSize: '0.7rem',
                   fontWeight: 700,
                   borderRadius: '4px',
                   background: selectedNode?.control_mode === mode ? 'var(--brand-500)' : 'transparent',
                   color: selectedNode?.control_mode === mode ? '#fff' : 'var(--text-muted)',
                   border: 'none',
                   cursor: 'pointer'
                 }}
               >
                 {mode}
               </button>
             ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 300, color: 'var(--text-muted)' }}>
          Loading nodes…
        </div>
      ) : nodes.length === 0 ? (
        <div className="glass-card p-10 text-center" style={{ color: 'var(--text-muted)' }}>
          <p>No nodes found. Add a node in Node Management to get started.</p>
        </div>
      ) : (
        <>
          {/* Top Row: 3D Map and 3D Action Window */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <NodeMap
              nodes={nodes}
              latestReadings={latestReadings}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
            <ActionWindow 
              classifierLabel={currentReading?.classifier_label} 
              isRelayOn={currentReading?.relay_state} 
              confidence={currentReading?.classifier_confidence}
              reason={
                currentReading?.relay_state
                  ? `AI triggered: ${currentReading?.classifier_label?.replace(/_/g,' ') ?? 'anomaly detected'}. PM10: ${currentReading?.pm10_corrected?.toFixed(1) ?? '—'} µg/m³, PM2.5: ${currentReading?.pm2_5_corrected?.toFixed(1) ?? '—'} µg/m³`
                  : 'Monitoring — conditions within normal range'
              }
            />
          </div>

          {/* Middle Row: Vital Stats (AQI, Relay, Dust, Classifier) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* AQI + sub-index spike reason */}
            <div className="glass-card p-5 flex flex-col items-center justify-center">
              <AQIBadge
                aqi={currentReading?.aqi}
                category={currentReading?.aqi_category}
                size="lg"
                pm25Subindex={currentReading?.aqi_pm25_subindex}
                pm10Subindex={currentReading?.aqi_pm10_subindex}
                prevAqi={prevReading?.aqi}
              />
            </div>
            
            {/* Relay */}
            <div className="glass-card p-5 flex flex-col items-center justify-center">
              <RelayStatus isOn={currentReading?.relay_state} nodeId={selectedNodeId} />
            </div>
            
            {/* Impact Metric */}
            <div className="glass-card p-5 flex flex-col items-center justify-center" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Dust Suppressed
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', textShadow: '0 0 10px rgba(56, 189, 248, 0.4)' }}>
                {dustSuppressedKg} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>kg</span>
              </div>
            </div>

            {/* Classifier + Forecast combined */}
            <div className="glass-card p-5 flex flex-col justify-center">
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Source Classification
              </div>
              {currentReading?.classifier_label ? (
                <>
                  <div
                    className="text-md font-bold mb-2"
                    style={{ color: classifierColors[currentReading.classifier_label] || 'var(--text-primary)' }}
                  >
                    {currentReading.classifier_label.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  {/* Confidence bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Confidence</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {((currentReading.classifier_confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(currentReading.classifier_confidence || 0) * 100}%`,
                          background: classifierColors[currentReading.classifier_label] || 'var(--brand-500)',
                          borderRadius: 2,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 8 }}>
                  No classification data yet
                </div>
              )}

              {/* AI Forecast inline */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  AI PM10 Forecast
                </div>
                <div className="flex justify-between mb-2">
                <div className="text-center">
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+10m</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>{currentReading?.forecast_10m?.toFixed(0) || '—'} <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>µg</span></div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+20m</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>{currentReading?.forecast_20m?.toFixed(0) || '—'} <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>µg</span></div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+30m</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>{currentReading?.forecast_30m?.toFixed(0) || '—'} <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>µg</span></div>
                  </div>
                </div>
                <div style={{ padding: '6px 8px', background: 'rgba(56,189,248,0.08)', borderRadius: 6, fontSize: '0.7rem', color: '#38bdf8' }}>
                  {currentReading?.relay_state ? '🤖 Autonomous intervention active.' : '🟢 Standby — conditions normal.'}
                </div>
              </div>
            </div>
          </div>

          {/* PM readings */}
          <div className="mb-4">
            <LiveReadingsCard reading={currentReading} />
          </div>



          {/* Timeline */}
          <div className="mb-4">
            <TimelineChart readings={readings} pm10Threshold={selectedNode?.pm10_threshold} />
          </div>

          {/* Data Quality tab */}
          <div className="glass-card mb-4" style={{ padding: 0 }}>
            <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
              {['live', 'quality'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: tab === t ? '2px solid var(--brand-500)' : '2px solid transparent',
                    color: tab === t ? 'var(--brand-400)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: -1,
                  }}
                >
                  {t === 'live' ? 'Recent Readings' : 'Data Quality Panel'}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === 'quality' ? (
                <DataQualityPanel readings={readings} />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="ss-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>PM1.0</th>
                        <th>PM2.5</th>
                        <th>PM10</th>
                        <th>PM10 corr.</th>
                        <th>AQI</th>
                        <th>Source</th>
                        <th>Relay</th>
                        <th>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.slice(0, 20).map(r => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            {new Date(r.timestamp).toLocaleTimeString()}
                          </td>
                          <td>{r.pm1_0_raw ?? '—'}</td>
                          <td>{r.pm2_5_raw ?? '—'}</td>
                          <td style={{ color: r.quality_flags?.pm10 === 'failed_read' ? '#f87171' : 'inherit' }}>
                            {r.pm10_raw ?? <span style={{ color: '#f87171' }}>NULL</span>}
                          </td>
                          <td style={{ color: '#38bdf8' }}>{r.pm10_corrected?.toFixed(1) ?? '—'}</td>
                          <td>{r.aqi ?? '—'}</td>
                          <td style={{ fontSize: '0.72rem' }}>{r.classifier_label ?? '—'}</td>
                          <td>
                            <span style={{ color: r.relay_state ? '#ef4444' : '#4a5876', fontWeight: 700 }}>
                              {r.relay_state ? 'ON' : 'OFF'}
                            </span>
                          </td>
                          <td>
                            <QualityFlagBadge flags={r.quality_flags || {}} compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
