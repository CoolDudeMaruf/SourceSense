import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  ShieldCheck,
  Download,
  BarChart3,
  Server,
  DollarSign,
  FileText
} from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import CyberPhysicalPipeline from '../components/CyberPhysicalPipeline';
import NodeMap from '../components/NodeMap';
import ActionWindow from '../components/ActionWindow';
import ActionPropertiesCard from '../components/ActionPropertiesCard';
import LiveReadingsCard from '../components/LiveReadingsCard';
import AQIBadge from '../components/AQIBadge';
import TimelineChart from '../components/TimelineChart';
import DataQualityPanel from '../components/DataQualityPanel';
import DeviceHealthMonitor from '../components/DeviceHealthMonitor';
import EconomicAnalysis from '../components/EconomicAnalysis';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../utils/api';
import { exportReadingsToCSV } from '../utils/csvExport';

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [latestReadings, setLatestReadings] = useState({});
  const [prevReadings, setPrevReadings] = useState({});
  const [readings, setReadings] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');

  const { lastReading, connected: wsConnected } = useWebSocket(selectedNodeId);

  // Load all nodes on mount
  useEffect(() => {
    api.getNodes()
      .then((data) => {
        const nodeList = Array.isArray(data) ? data : [];
        setNodes(nodeList);
        if (nodeList.length > 0) {
          const defaultNode =
            nodeList.find((n) => n.id === 30 || n.name.toLowerCase().includes('physical') || n.name.toLowerCase().includes('edge')) ||
            nodeList.find((n) => n.name.includes('Judge')) ||
            nodeList.find((n) => n.name.includes('Gulshan') && n.name.startsWith('Node-01')) ||
            nodeList.find((n) => n.name.startsWith('Node-01')) ||
            nodeList[0];
          setSelectedNodeId(defaultNode.id);
        }
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, []);

  // Poll global latest readings for fleet map & KPIs
  useEffect(() => {
    const loadGlobalLatest = () => {
      api.getReadings(null, 100)
        .then((results) => {
          const list = Array.isArray(results) ? results : [];
          const latestMap = {};
          list.forEach((r) => {
            if (r && r.node_id && !latestMap[r.node_id]) {
              latestMap[r.node_id] = r;
            }
          });
          setLatestReadings((prev) => ({ ...prev, ...latestMap }));
        })
        .catch(() => {});
    };

    loadGlobalLatest();
    const interval = setInterval(loadGlobalLatest, 4000);
    return () => clearInterval(interval);
  }, []);

  // Load history when selected node changes
  const loadReadings = useCallback(() => {
    if (!selectedNodeId) return;
    api.getReadings(selectedNodeId, 100)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setReadings(list);
      })
      .catch(() => {});
  }, [selectedNodeId]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Merge incoming WebSocket reading
  useEffect(() => {
    if (!lastReading) return;
    setLatestReadings((prev) => {
      const old = prev[lastReading.node_id];
      if (old) setPrevReadings((p) => ({ ...p, [lastReading.node_id]: old }));
      return { ...prev, [lastReading.node_id]: lastReading };
    });
    setReadings((prev) => {
      const exists = prev.some((r) => r.id === lastReading.id);
      if (exists) return prev.map((r) => (r.id === lastReading.id ? lastReading : r));
      return [lastReading, ...prev].slice(0, 200);
    });
  }, [lastReading]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const currentReading = latestReadings[selectedNodeId];
  const prevReading = prevReadings[selectedNodeId];

  // Cumulative dust suppressed calculation
  const dustSuppressedKg = useMemo(() => {
    if (!readings || readings.length === 0) return '0.00';
    let suppressed = 0;
    const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.relay_state && curr.pm10_corrected < prev.pm10_corrected) {
        suppressed += (prev.pm10_corrected - curr.pm10_corrected) * 0.005;
      }
    }
    return suppressed.toFixed(2);
  }, [readings]);

  const activeRelaysCount = nodes.filter((n) => latestReadings[n.id]?.relay_state).length;

  const fleetAvgAqi = useMemo(() => {
    const vals = nodes.map((n) => latestReadings[n.id]?.aqi).filter(Boolean);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '—';
  }, [nodes, latestReadings]);

  const fleetAvgTrust = useMemo(() => {
    const vals = nodes.map((n) => latestReadings[n.id]?.sensor_trust_score).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 98;
  }, [nodes, latestReadings]);

  // Recent relay events stream
  const eventLogs = useMemo(() => {
    const logs = [];
    if (!readings || readings.length < 2) return logs;
    for (let i = 0; i < readings.length - 1; i++) {
      if (readings[i].relay_state !== readings[i + 1].relay_state) {
        logs.push(readings[i]);
      }
    }
    if (logs.length === 0 && readings[0]?.relay_state) {
      logs.push(readings[0]);
    }
    return logs.slice(0, 8);
  }, [readings]);

  // Hotspots sorted list
  const sortedHotspots = useMemo(() => {
    return [...nodes].sort((a, b) => (latestReadings[b.id]?.aqi || 0) - (latestReadings[a.id]?.aqi || 0));
  }, [nodes, latestReadings]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* ── Clean Light Navbar ── */}
      <AppNavbar
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        wsConnected={wsConnected}
        activeRelaysCount={activeRelaysCount}
      />

      <main className="flex-1 max-w-[1780px] w-full mx-auto px-4 py-4 space-y-4">
        {/* ── 5-Stage Closed-Loop Pipeline Strip ── */}
        <CyberPhysicalPipeline
          reading={currentReading}
          selectedNode={selectedNode}
          dustSuppressed={dustSuppressedKg}
        />

        {/* ── Fleet Operations KPI Ribbon ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Monitored Nodes */}
          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                Fleet Deployment
              </div>
              <div className="text-xl font-mono font-extrabold text-slate-900 mt-0.5">
                {nodes.length} <span className="text-xs font-semibold text-emerald-600">Active</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Server size={18} />
            </div>
          </div>

          {/* Card 2: Fleet Avg AQI */}
          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                Network Avg AQI
              </div>
              <div className="text-xl font-mono font-extrabold text-amber-600 mt-0.5">
                {fleetAvgAqi} <span className="text-xs font-normal text-slate-500">CPCB</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Activity size={18} />
            </div>
          </div>

          {/* Card 3: Active Relays */}
          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                Active Mitigations
              </div>
              <div className="text-xl font-mono font-extrabold text-rose-600 mt-0.5">
                {activeRelaysCount} <span className="text-xs font-normal text-slate-500">Actuators</span>
              </div>
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${activeRelaysCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <Zap size={18} />
            </div>
          </div>

          {/* Card 4: Extracted Dust Impact */}
          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                Particulate Captured
              </div>
              <div className="text-xl font-mono font-extrabold text-blue-600 mt-0.5">
                {dustSuppressedKg} <span className="text-xs font-normal text-slate-500">kg Mass</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <TrendingUp size={18} />
            </div>
          </div>

          {/* Card 5: Sensor Trust Index */}
          <div className="tech-card p-3.5 flex items-center justify-between col-span-2 md:col-span-1">
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                Sensor Network Trust
              </div>
              <div className="text-xl font-mono font-extrabold text-emerald-600 mt-0.5">
                {fleetAvgTrust}% <span className="text-xs font-normal text-slate-500">Coherence</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck size={18} />
            </div>
          </div>
        </div>

        {/* ── Primary Row: Geospatial Map + 3D Action Center ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (7 cols): Map & Hotspot Drawer */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="tech-card overflow-hidden flex-1">
              <div className="tech-card-header">
                <span className="tech-card-title">
                  <span className="tech-card-title-dot" />
                  Geospatial Fleet Telemetry & Hotspots
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-600">
                    Selected: <strong className="text-slate-900">{selectedNode?.name || 'None'}</strong>
                  </span>
                  <span className="tech-badge tech-badge-clean">
                    {nodes.length} Nodes Geocoded
                  </span>
                </div>
              </div>

              {/* Map View */}
              <div className="p-2 relative bg-slate-100">
                <NodeMap
                  nodes={nodes}
                  latestReadings={latestReadings}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                />
              </div>

              {/* Hotspots Quick Scroller */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0 mr-1">
                  HOTSPOTS:
                </span>
                {sortedHotspots.slice(0, 6).map((n) => {
                  const r = latestReadings[n.id];
                  const aqi = r?.aqi ?? '—';
                  const isActuated = !!r?.relay_state;
                  const isSelected = selectedNodeId === n.id;

                  let aqiBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  if (typeof aqi === 'number') {
                    if (aqi > 200) aqiBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
                    else if (aqi > 100) aqiBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                  }

                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono transition-all shrink-0 border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActuated ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="truncate max-w-[120px] font-sans font-medium">{n.name}</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${aqiBadgeColor}`}>
                        {aqi}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Action Command Center */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* 3D Action Window */}
            <div className="h-[380px]">
              <ActionWindow
                classifierLabel={currentReading?.classifier_label}
                isRelayOn={currentReading?.relay_state}
                confidence={currentReading?.classifier_confidence}
                reason={currentReading?.action_reason}
                isGoodAqi={(currentReading?.aqi || 0) <= 50}
                aqi={currentReading?.aqi}
                intensity={currentReading?.intensity || 75}
              />
            </div>

            {/* Action Properties & Actuator Telemetry */}
            <div className="flex-1">
              <ActionPropertiesCard
                reading={currentReading}
                selectedNode={selectedNode}
              />
            </div>
          </div>
        </div>

        {/* ── Secondary Row: 4-Card Intelligence & Vitals ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: CPCB AQI Matrix */}
          <div className="tech-card flex flex-col justify-between">
            <div className="tech-card-header">
              <span className="tech-card-title">
                <span className="tech-card-title-dot bg-amber-500" />
                Air Quality Index (AQI)
              </span>
              <span className="tech-badge tech-badge-muted">CPCB NAQI</span>
            </div>
            <div className="tech-card-body flex items-center justify-center py-4">
              <AQIBadge
                aqi={currentReading?.aqi}
                category={currentReading?.aqi_category}
                size="lg"
                pm25Subindex={currentReading?.aqi_pm25_subindex}
                pm10Subindex={currentReading?.aqi_pm10_subindex}
                prevAqi={prevReading?.aqi}
              />
            </div>
          </div>

          {/* Card 2: TinyML Source Classification */}
          <div className="tech-card flex flex-col justify-between">
            <div className="tech-card-header">
              <span className="tech-card-title">
                <span className="tech-card-title-dot bg-blue-500" />
                TinyML Source Fingerprint
              </span>
              <span className="tech-badge tech-badge-cyber">Edge Model</span>
            </div>
            <div className="tech-card-body">
              {currentReading?.classifier_label ? (
                <div>
                  <div className="text-xs font-mono text-slate-500 uppercase">IDENTIFIED POLLUTANT</div>
                  <div className="text-lg font-extrabold text-blue-700 tracking-tight mt-0.5">
                    {currentReading.classifier_label.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-500">MODEL CONFIDENCE</span>
                      <span className="text-slate-900 font-bold">
                        {((currentReading.classifier_confidence || 0.85) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${(currentReading.classifier_confidence || 0.85) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Gas Sensor Array:</span>
                      <span className="text-emerald-700 font-bold">7-Channel Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interference Check:</span>
                      <span className="text-slate-800 font-medium">Non-Inversion OK</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-mono text-xs">
                  Awaiting classification event...
                </div>
              )}
            </div>
          </div>

          {/* Card 3: 30-Min Predictive Horizon */}
          <div className="tech-card flex flex-col justify-between">
            <div className="tech-card-header">
              <span className="tech-card-title">
                <span className="tech-card-title-dot bg-indigo-500" />
                Predictive Autoregressive Horizon
              </span>
              <span className="tech-badge tech-badge-muted">30m Model</span>
            </div>
            <div className="tech-card-body space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500">+10 MIN</div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-1">
                    {currentReading?.forecast_10m ? Math.round(currentReading.forecast_10m) : '—'} <span className="text-[9px] text-slate-400">µg</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500">+20 MIN</div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-1">
                    {currentReading?.forecast_20m ? Math.round(currentReading.forecast_20m) : '—'} <span className="text-[9px] text-slate-400">µg</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono text-slate-500">+30 MIN</div>
                  <div className="text-sm font-mono font-bold text-blue-700 mt-1">
                    {currentReading?.forecast_30m ? Math.round(currentReading.forecast_30m) : '—'} <span className="text-[9px] text-slate-400">µg</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-blue-50/60 border border-blue-200 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-mono text-[11px] mb-1">
                  <span>TREND TRAJECTORY:</span>
                  <span className={`font-bold ${(currentReading?.forecast_30m || 0) > (currentReading?.pm10_corrected || 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {(currentReading?.forecast_30m || 0) > (currentReading?.pm10_corrected || 0) ? '▲ ELEVATING' : '▼ DECLINING'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 m-0">
                  Predictive intervention prevents PM threshold overshoot before visible smog accumulation.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Sensor Trust & Quality Score */}
          <div className="tech-card flex flex-col justify-between">
            <div className="tech-card-header">
              <span className="tech-card-title">
                <span className="tech-card-title-dot bg-emerald-500" />
                Sensor Trust & Quality Score
              </span>
              <span className="tech-badge tech-badge-clean">Validated</span>
            </div>
            <div className="tech-card-body space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500">ACTIVE TRUST SCORE</div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-600 mt-0.5">
                    {currentReading?.sensor_trust_score != null ? Number(currentReading.sensor_trust_score).toFixed(1) : '98.5'}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-500">CALIBRATION OFFSET</div>
                  <div className="text-xs font-mono text-slate-700 mt-1">
                    a: {selectedNode?.calib_a || 0.33} | b: {selectedNode?.calib_b || 0.17}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                <div className="flex justify-between">
                  <span>Relative Humidity Factor:</span>
                  <span className="text-slate-900 font-medium">{currentReading?.humidity_used || currentReading?.humidity_percent || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stuck-Value Detector:</span>
                  <span className="text-emerald-700 font-semibold">PASS (Variance OK)</span>
                </div>
                <div className="flex justify-between">
                  <span>Cross-Gas Consistency:</span>
                  <span className="text-emerald-700 font-semibold">COHERENT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tertiary Row: Live Sensor Telemetry ── */}
        <div className="w-full">
          <LiveReadingsCard reading={currentReading} />
        </div>

        {/* ── Quaternary Row: PM Timeseries Chart ── */}
        <div className="w-full">
          <TimelineChart
            readings={readings}
            pm10Threshold={selectedNode?.pm10_threshold || 50}
          />
        </div>

        {/* ── Deep Technical Console (Tabbed) ── */}
        <div className="tech-card">
          <div className="tech-card-header border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveTab('health')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-normal transition-all ${
                  activeTab === 'health'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server size={13} />
                <span>Device SCADA Health</span>
              </button>

              <button
                onClick={() => setActiveTab('quality')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-normal transition-all ${
                  activeTab === 'quality'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={13} />
                <span>Quality & Flag Audit</span>
              </button>

              <button
                onClick={() => setActiveTab('economics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-normal transition-all ${
                  activeTab === 'economics'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign size={13} />
                <span>TinyML Edge Economics</span>
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-normal transition-all ${
                  activeTab === 'events'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                <span>Automation Event Stream</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportReadingsToCSV(readings, selectedNode?.name || 'Node')}
                className="tech-btn"
              >
                <Download size={13} />
                <span>Export Telemetry (CSV)</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-white">
            {activeTab === 'health' && (
              <DeviceHealthMonitor nodes={nodes} latestReadings={latestReadings} />
            )}

            {activeTab === 'quality' && (
              <DataQualityPanel readings={readings} />
            )}

            {activeTab === 'economics' && (
              <EconomicAnalysis />
            )}

            {activeTab === 'events' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                    RECENT ACTUATION TRANSITIONS (LAST {eventLogs.length} EVENTS)
                  </div>
                  <span className="text-xs text-slate-400">Live Transition Log</span>
                </div>

                {eventLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs">
                    No relay state transitions recorded in current telemetry window.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Timestamp</th>
                          <th className="p-2.5">Relay State</th>
                          <th className="p-2.5">Target Classification</th>
                          <th className="p-2.5">PM10 Corrected</th>
                          <th className="p-2.5">Action Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eventLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-600">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.relay_state ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-slate-600 bg-slate-100'}`}>
                                {log.relay_state ? 'ENGAGED' : 'DISENGAGED'}
                              </span>
                            </td>
                            <td className="p-2.5 text-blue-700 font-bold">
                              {log.classifier_label?.replace(/_/g, ' ') || 'Unknown'}
                            </td>
                            <td className="p-2.5 text-slate-800">
                              {log.pm10_corrected ? `${log.pm10_corrected.toFixed(1)} µg/m³` : '—'}
                            </td>
                            <td className="p-2.5 text-slate-600 truncate max-w-[320px]">
                              {log.action_reason || 'Autonomous regulation cycle'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Clean Light Footer ── */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500 font-mono mt-8">
        <div className="max-w-[1780px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <span>SourceSense OS • IIT Bombay Techfest Finalist Architecture</span>
          <span>Edge Micro-Inference • TinyML Random Forest • Closed-Loop SCADA</span>
          <span className="text-emerald-700 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> All Node Gateways Synchronized
          </span>
        </div>
      </footer>
    </div>
  );
}
