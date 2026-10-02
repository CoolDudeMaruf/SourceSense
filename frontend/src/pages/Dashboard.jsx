import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Wifi, WifiOff, Download, Activity, Sun, Moon, Leaf, Zap, Battery } from 'lucide-react';
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

/* ─── Osen theme tokens injected as a <style> block ─── */
const OSEN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');

  /* ════════════════════════════════════════════════════
     GLOBAL OVERRIDE — Neutralize the dark index.css theme
     These vars are set by :root in index.css (#0a0f1a etc)
     We re-declare them INSIDE .osen-root so they don't bleed in.
     ════════════════════════════════════════════════════ */
  .osen-root,
  .osen-root * {
    --bg-primary:     #f8f9fb;
    --bg-secondary:   #f0f2f5;
    --bg-card:        #ffffff;
    --bg-card-hover:  #f8f9fb;
    --border:         #e9ecef;
    --text-primary:   #212529;
    --text-secondary: #6c757d;
    --text-muted:     #adb5bd;
  }

  /* Override global scrollbar that uses --bg-primary (dark navy) */
  .osen-root ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  .osen-root ::-webkit-scrollbar-track {
    background: transparent;
  }
  .osen-root ::-webkit-scrollbar-thumb {
    background: #dee2e6;
    border-radius: 4px;
  }
  .osen-root ::-webkit-scrollbar-thumb:hover {
    background: #ced4da;
  }

  /* Force the browser body/html to day theme when this page is mounted */
  html, body {
    background: #f8f9fb !important;
    margin: 0 !important;
    padding: 0 !important;
    /* Prevent body scroll — osen-root is the single scroll container */
    overflow: hidden !important;
  }

  .osen-root {
    font-family: 'Roboto', system-ui, -apple-system, sans-serif;
    font-size: 0.95rem;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Full viewport takeover, clean white page */
    position: fixed;
    inset: 0;
    overflow-y: auto;
    background: #f8f9fb;
    z-index: 9999;
  }

  /* ── Light mode tokens (forced for ContestDashboard) ── */
  .osen-root {
    --ob: #f8f9fb;
    --oc: #ffffff;
    --os: #ffffff;
    --oh: #ffffff;
    --tp: #212529;
    --ts: #6c757d;
    --ti: #ffffff;
    --be: #e9ecef;
    --bs: #dee2e6;
    --op: #0d6efd;
    --oph: #0b5ed7;
    --ogs: #198754;
    --ogd: #dc3545;
    --ow: #ffc107;
    --oi: #0dcaf0;
    --osha: 0 0.125rem 0.25rem rgba(0,0,0,0.05);
    --osh: 0 0.5rem 1rem rgba(0,0,0,0.06);
    --oshh: 0 0.75rem 1.5rem rgba(0,0,0,0.08);
    --or: 0.375rem;
    --orl: 0.5rem;
  }

  /* ── Layout wrapper ── */
  .osen-layout {
    display: flex;
    min-height: 100vh;
    background: var(--ob);
    color: var(--tp);
  }

  /* ── Sidebar ── */
  .osen-sidebar {
    width: 240px;
    min-width: 240px;
    background: #ffffff;
    border-right: 1px solid #f0f2f5;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1000;
  }

  /* Hide the webkit scrollbar track on sidebar-nav completely */
  .osen-sidebar-nav::-webkit-scrollbar {
    display: none;
  }

  .osen-sidebar-brand {
    height: auto;
    min-height: 64px;
    display: flex;
    align-items: center;
    padding: 18px 20px;
    border-bottom: 1px solid #e9ecef;
    gap: 12px;
    flex-shrink: 0;
    background: #ffffff;
    z-index: 2;
  }

  .osen-brand-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #0d6efd, #0dcaf0);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .osen-brand-name {
    font-weight: 800;
    font-size: 1rem;
    color: var(--tp);
    line-height: 1.1;
  }

  .osen-brand-sub {
    font-size: 0.6rem;
    color: var(--ts);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .osen-sidebar-nav {
    padding: 1rem 0;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;        /* Firefox: hide scrollbar */
    -ms-overflow-style: none;     /* IE/Edge: hide scrollbar */
    display: flex;
    flex-direction: column;
  }

  .osen-nav-section {
    padding: 0 1rem 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ts);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.75rem;
  }

  .osen-nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1.25rem;
    color: var(--tp);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    background: transparent;
    border-top: none;
    border-right: none;
    border-bottom: none;
    width: 100%;
    text-align: left;
  }

  .osen-nav-item:hover {
    background: rgba(13,110,253,0.05);
    color: var(--op);
  }

  .osen-nav-item.active {
    background: rgba(13,110,253,0.08);
    border-left-color: var(--op);
    color: var(--op);
    font-weight: 600;
  }

  .osen-sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--be);
    font-size: 0.72rem;
    color: var(--ts);
    line-height: 1.6;
  }

  /* ── Main wrapper ── */
  /* Offset left by sidebar width so content starts right after sidebar */
  .osen-main-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow-x: hidden;
    margin-left: 240px;
    min-height: 100vh;
    background: #f8f9fb;
  }

  /* ── Header ── */
  .osen-header {
    height: 60px;
    background: #ffffff;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    position: sticky;
    top: 0;
    z-index: 900;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .osen-header-left,
  .osen-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .osen-page-eyebrow {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ts);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .osen-page-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--tp);
    margin: 0;
    line-height: 1.2;
  }

  .osen-icon-btn {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--be);
    background: var(--oc);
    color: var(--tp);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }

  .osen-icon-btn:hover {
    background: var(--ob);
    border-color: var(--bs);
    box-shadow: var(--osha);
  }

  .osen-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    border-radius: var(--or);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid var(--be);
    background: var(--oc);
    color: var(--tp);
  }

  .osen-btn:hover {
    background: var(--ob);
    box-shadow: var(--osha);
  }

  .osen-btn-primary {
    background: var(--op);
    border-color: var(--op);
    color: #fff;
  }

  .osen-btn-primary:hover {
    background: var(--oph);
    border-color: var(--oph);
    box-shadow: 0 0.25rem 0.75rem rgba(13,110,253,0.25);
  }

  /* ── Page content ── */
  .osen-content {
    flex: 1;
    padding: 1.75rem 2rem;
    background: var(--ob);
  }

  /* ── Cards ── */
  .osen-card {
    background: var(--oc);
    border: 1px solid var(--be);
    border-radius: var(--orl);
    box-shadow: var(--osha);
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .osen-card:hover {
    box-shadow: var(--oshh);
  }

  .osen-card-inner {
    padding: 1.25rem;
  }

  .osen-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--be);
  }

  .osen-card-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--tp);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .osen-card-title-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--op);
  }

  /* ── KPI Cards ── */
  .osen-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .osen-kpi-card {
    background: var(--oc);
    border: 1px solid var(--be);
    border-radius: var(--orl);
    padding: 1.25rem;
    box-shadow: var(--osha);
    transition: box-shadow 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }

  .osen-kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: var(--orl) var(--orl) 0 0;
    background: linear-gradient(90deg, var(--op), var(--oi));
    opacity: 0;
    transition: opacity 0.2s;
  }

  .osen-kpi-card:hover {
    box-shadow: var(--oshh);
    transform: translateY(-2px);
  }

  .osen-kpi-card:hover::before {
    opacity: 1;
  }

  .osen-kpi-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ts);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .osen-kpi-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--tp);
    line-height: 1.15;
    margin-bottom: 0.4rem;
  }

  .osen-kpi-trend {
    font-size: 0.78rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--ts);
  }

  .osen-trend-up { color: var(--ogs); }
  .osen-trend-neutral { color: var(--oi); }

  /* ── Grid layouts ── */
  .osen-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .osen-grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 1100px) {
    .osen-grid-4 { grid-template-columns: repeat(2, 1fr); }
    .osen-grid-2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .osen-grid-4 { grid-template-columns: 1fr; }
  }

  /* ── Node selector pills ── */
  .osen-node-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: var(--oc);
    border: 1px solid var(--be);
    border-radius: var(--orl);
    box-shadow: var(--osha);
  }

  .osen-node-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.85rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--be);
    background: var(--ob);
    color: var(--ts);
    transition: all 0.15s;
  }

  .osen-node-pill:hover {
    border-color: var(--op);
    color: var(--op);
    background: rgba(13,110,253,0.05);
  }

  .osen-node-pill.active {
    background: var(--op);
    border-color: var(--op);
    color: #fff;
    box-shadow: 0 0.25rem 0.5rem rgba(13,110,253,0.25);
  }

  .osen-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 999px;
    background: rgba(13,110,253,0.08);
    color: var(--op);
    border: 1px solid rgba(13,110,253,0.15);
    margin-left: auto;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ── WS Status chip ── */
  .osen-ws-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid var(--be);
    background: var(--oc);
  }

  .osen-ws-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .osen-ws-dot.live {
    background: var(--ogs);
    box-shadow: 0 0 0 3px rgba(25,135,84,0.15);
    animation: ws-pulse 2s ease infinite;
  }

  .osen-ws-dot.offline {
    background: var(--ogd);
  }

  @keyframes ws-pulse {
    0%,100% { box-shadow: 0 0 0 3px rgba(25,135,84,0.15); }
    50%      { box-shadow: 0 0 0 6px rgba(25,135,84,0.0); }
  }

  /* ── Tabs ── */
  .osen-tab-bar {
    display: flex;
    border-bottom: 1px solid var(--be);
    margin-bottom: 0;
  }

  .osen-tab {
    padding: 0.7rem 1.25rem;
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--ts);
    cursor: pointer;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
  }

  .osen-tab:hover { color: var(--tp); }

  .osen-tab.active {
    color: var(--op);
    border-bottom-color: var(--op);
  }

  /* ── Table ── */
  .osen-table-wrap { overflow-x: auto; }

  .osen-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .osen-table th {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid var(--be);
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ts);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    background: var(--ob);
  }

  .osen-table td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid var(--be);
    color: var(--tp);
    vertical-align: middle;
  }

  .osen-table tbody tr {
    transition: background 0.1s;
  }

  .osen-table tbody tr:hover {
    background: rgba(13,110,253,0.03);
  }

  .osen-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2em 0.65em;
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 999px;
    line-height: 1;
    white-space: nowrap;
  }

  .osen-badge-success {
    background: rgba(25,135,84,0.1);
    color: var(--ogs);
  }

  .osen-badge-danger {
    background: rgba(220,53,69,0.1);
    color: var(--ogd);
  }

  .osen-badge-muted {
    background: var(--ob);
    color: var(--ts);
    border: 1px solid var(--be);
  }

  /* ── Section spacing ── */
  .osen-section { margin-bottom: 1.25rem; }

  /* ── Divider ── */
  .osen-divider {
    border: none;
    border-top: 1px solid var(--be);
    margin: 0.75rem 0;
  }

  /* ── Inline stat ── */
  .osen-inline-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .osen-inline-stat-val {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ogd);
  }

  .osen-inline-stat-label {
    font-size: 0.6rem;
    color: var(--ts);
    margin-top: 1px;
  }

  .osen-confidence-bar-bg {
    height: 4px;
    border-radius: 2px;
    background: var(--be);
    overflow: hidden;
  }

  .osen-confidence-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .osen-ai-chip {
    padding: 0.45rem 0.75rem;
    background: rgba(13,110,253,0.06);
    border-radius: var(--or);
    font-size: 0.73rem;
    color: var(--oi);
    font-weight: 500;
    border: 1px solid rgba(13,110,253,0.12);
  }

  /* ── Loading & empty states ── */
  .osen-state-center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: var(--ts);
    font-size: 0.9rem;
  }

  .osen-empty-card {
    padding: 3rem;
    text-align: center;
    background: var(--oc);
    border: 1px solid var(--be);
    border-radius: var(--orl);
    color: var(--ts);
  }

  /* ── Overrides for child components (Day theme force) ── */
  .osen-root .glass-card {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    color: var(--tp) !important;
  }
  .osen-root .glass-card [style*="color: #fff"],
  .osen-root .glass-card [style*="color: white"],
  .osen-root .glass-card [style*="color: var(--text-primary)"] {
    color: var(--tp) !important;
  }
  .osen-root .glass-card [style*="color: var(--text-muted)"],
  .osen-root .glass-card [style*="color: var(--text-secondary)"] {
    color: var(--ts) !important;
  }
  .osen-root [style*="background: rgba(0, 0, 0, 0.4)"],
  .osen-root [style*="background: 'rgba(0,0,0,0.4)'"],
  .osen-root [style*="background: #111"],
  .osen-root [style*="background: var(--bg-secondary)"] {
    background: transparent !important;
  }
  .osen-root .recharts-cartesian-grid line {
    stroke: var(--be) !important;
  }
  .osen-root .recharts-text {
    fill: var(--ts) !important;
  }
  .osen-root .recharts-default-tooltip {
    background: var(--oc) !important;
    border: 1px solid var(--be) !important;
    color: var(--tp) !important;
  }
`;

/* ─────────────────────────────────────────────── */

const classifierColors = {
  construction_dust: '#f59e0b',
  vehicle_combustion: '#f97316',
  waste_burning: '#ef4444',
  humid_haze: '#0dcaf0',
  clean: '#198754',
};

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [readings, setReadings] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [prevReadings, setPrevReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live');
  const [sessionStartTime] = useState(Date.now());
  const [uptimeStr, setUptimeStr] = useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptimeStr(`${m}:${s}`);
    }, 1000);
    // return () => clearInterval
  }, [sessionStartTime]);

  // Lock the window scroll so only our fixed osen-root scrolls — prevents the startup jump
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, []);

  const { lastReading, connected } = useWebSocket(selectedNodeId);

  useEffect(() => {
    api.getNodes()
      .then(data => {
        const nodeList = Array.isArray(data) ? data : [];
        setNodes(nodeList);
        if (nodeList.length > 0) {
          const defaultNode = nodeList.find(n => n.name.includes("Gulshan") && n.name.startsWith("Node-01"))
            || nodeList.find(n => n.name.startsWith("Node-01"))
            || nodeList[0];
          setSelectedNodeId(defaultNode.id);
        }
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, []);

  // Poll global latest for map & KPIs
  useEffect(() => {
    const loadGlobalLatest = () => {
      api.getReadings(null, 100).then(results => {
        const list = Array.isArray(results) ? results : [];
        const latestMap = {};
        list.forEach(r => {
          if (r && r.node_id && !latestMap[r.node_id]) {
            latestMap[r.node_id] = r;
          }
        });
        setLatestReadings(prev => ({ ...prev, ...latestMap }));
      }).catch(() => {});
    };
    
    loadGlobalLatest();
    const interval = setInterval(loadGlobalLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load history ONLY when node selection changes
  useEffect(() => {
    if (!selectedNodeId) return;
    api.getReadings(selectedNodeId, 100).then(data => {
      const list = Array.isArray(data) ? data : [];
      setReadings(list);
    }).catch(() => {});
  }, [selectedNodeId]);

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

  const activeNodes = nodes.filter(n => latestReadings[n.id]?.relay_state).length;
  const avgAqi = (() => {
    const vals = nodes.map(n => latestReadings[n.id]?.aqi).filter(Boolean);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '—';
  })();

  const eventLogs = useMemo(() => {
    const logs = [];
    if (!readings || readings.length < 2) return logs;
    for (let i = 0; i < readings.length - 1; i++) {
      if (readings[i].relay_state !== readings[i + 1].relay_state) {
        logs.push(readings[i]);
      }
    }
    // If no state changes, just show the most recent reading if it's active
    if (logs.length === 0 && readings[0]?.relay_state) {
      logs.push(readings[0]);
    }
    return logs.slice(0, 5);
  }, [readings]);

  return (
    <>
      <style>{OSEN_STYLES}</style>
      {/* osen-root covers the full viewport over the App wrapper with z-index:9999 */}
      <div className="osen-root" data-theme="light">
        <div className="osen-layout">

          {/* ── Sidebar ── */}
          <aside className="osen-sidebar">
            <div className="osen-sidebar-brand">
              <div className="osen-brand-icon">
                <Leaf size={16} color="#fff" />
              </div>
              <div>
                <div className="osen-brand-name">SourceSense</div>
                <div className="osen-brand-sub">Sense the invisible</div>
              </div>
            </div>

            <nav className="osen-sidebar-nav">
              <div className="osen-nav-section">Overview</div>
              <button className="osen-nav-item active">
                <Activity size={15} /> Dashboard
              </button>

              <div className="osen-nav-section" style={{ marginTop: '1.25rem' }}>AQI Hotspots</div>
              {[...nodes].sort((a, b) => (latestReadings[b.id]?.aqi || 0) - (latestReadings[a.id]?.aqi || 0)).map((n, idx) => {
                const r = latestReadings[n.id];
                const isOn = r?.relay_state;

                const getAqiStyle = (aqi) => {
                  if (aqi <= 50) return { bg: '#dcfce7', text: '#166534' }; // Good (Green)
                  if (aqi <= 100) return { bg: '#fef9c3', text: '#854d0e' }; // Moderate (Yellow)
                  if (aqi <= 150) return { bg: '#ffedd5', text: '#9a3412' }; // Unhealthy for Sensitive (Orange)
                  if (aqi <= 200) return { bg: '#fee2e2', text: '#991b1b' }; // Unhealthy (Red)
                  if (aqi <= 300) return { bg: '#f3e8ff', text: '#6b21a8' }; // Very Unhealthy (Purple)
                  return { bg: '#9f1239', text: '#ffffff' }; // Hazardous (Maroon)
                };
                const aqiStyle = r?.aqi !== undefined ? getAqiStyle(r.aqi) : { bg: '#f0f2f5', text: '#6c757d' };

                return (
                  <button
                    key={n.id}
                    className={`osen-nav-item ${selectedNodeId === n.id ? 'active' : ''}`}
                    onClick={() => setSelectedNodeId(n.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isOn ? '#ef4444' : '#198754',
                        boxShadow: isOn ? '0 0 0 3px rgba(239,68,68,0.2)' : '0 0 0 3px rgba(25,135,84,0.2)'
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        <span style={{ opacity: 0.5, marginRight: '4px', fontSize: '0.7rem' }}>{idx + 1}.</span>
                        {n.name}
                      </span>
                    </div>
                    {r?.aqi !== undefined && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: aqiStyle.bg,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: aqiStyle.text,
                        minWidth: '24px',
                        textAlign: 'center'
                      }}>
                        {r.aqi}
                      </span>
                    )}
                  </button>
                );
              })}

              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--be)', marginTop: 'auto', background: 'var(--ob)' }}>
                <div className="osen-nav-section" style={{ padding: 0, marginBottom: '0.75rem', color: 'var(--tp)' }}>AQI Index Guide</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.65rem', lineHeight: '1.3' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2c7a7b', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#2c7a7b' }}>0-50 Good:</strong> Minimal impact.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38a169', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#38a169' }}>51-100 Satisfactory:</strong> Minor breathing discomfort.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d69e2e', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#d69e2e' }}>101-200 Moderate:</strong> Breathing discomfort for sensitive people.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dd6b20', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#dd6b20' }}>201-300 Poor:</strong> Breathing discomfort to most people.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c53030', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#c53030' }}>301-400 Very Poor:</strong> Respiratory illness on prolonged exposure.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#805ad5', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: 'var(--ts)' }}><strong style={{ color: '#805ad5' }}>401+ Severe:</strong> Health impacts even on light physical activity.</span>
                  </div>
                </div>
              </div>

              <div className="osen-sidebar-footer">
                <div>Sense → Understand → Act</div>
                <div style={{ marginTop: 4, opacity: 0.7 }}>v1.0.0 · Bangladesh Regional</div>
              </div>
            </nav>
          </aside>

          {/* ── Main ── */}
          <div className="osen-main-wrapper">

            {/* ── Header ── */}
            <header className="osen-header">
              <div className="osen-header-left">
                <div>
                  <div className="osen-page-eyebrow">Air Quality Platform</div>
                  <div className="osen-page-title">Live Dashboard</div>
                </div>
              </div>
              <div className="osen-header-right">
                {/* WS Status */}
                <div className="osen-ws-chip">
                  <span className={`osen-ws-dot ${connected ? 'live' : 'offline'}`} />
                  {connected
                    ? <span style={{ color: 'var(--ogs)' }}>Live</span>
                    : <span style={{ color: 'var(--ogd)' }}>Offline</span>}
                </div>

                {/* Refresh */}
                <button className="osen-icon-btn" onClick={loadReadings} title="Refresh">
                  <RefreshCw size={15} />
                </button>

                {/* Export */}
                <button
                  className="osen-btn osen-btn-primary"
                  onClick={() => exportReadingsToCSV(readings, `sourcesense_node${selectedNodeId}.csv`)}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </header>

            {/* ── Page content ── */}
            <main className="osen-content">

              {/* ── KPI Row ── */}
              <div className="osen-kpi-grid osen-section">
                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ogs)', display: 'inline-block' }} />
                    Total Nodes
                  </div>
                  <div className="osen-kpi-value">{nodes.length}</div>
                  <div className="osen-kpi-trend osen-trend-up">
                    ↑ {nodes.length - activeNodes} monitoring, {activeNodes} active
                  </div>
                </div>

                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--oi)', display: 'inline-block' }} />
                    Avg. AQI
                  </div>
                  <div className="osen-kpi-value">{avgAqi}</div>
                  <div className="osen-kpi-trend osen-trend-neutral">
                    ◉ Cross-node average
                  </div>
                </div>

                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0dcaf0', display: 'inline-block' }} />
                    Dust Suppressed
                  </div>
                  <div className="osen-kpi-value" style={{ color: 'var(--oi)' }}>
                    {dustSuppressedKg} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ts)' }}>gram</span>
                  </div>
                  <div className="osen-kpi-trend">
                    ∑ Cumulative since session start
                  </div>
                </div>

                <div className="osen-kpi-card">
                  <div className="osen-kpi-label">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)', display: 'inline-block' }} />
                    Relay State
                  </div>
                  <div className="osen-kpi-value" style={{ color: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)', fontSize: '1.4rem' }}>
                    {currentReading?.relay_state ? '● ACTIVE' : '○ STANDBY'}
                  </div>
                  <div className="osen-kpi-trend">
                    Node {selectedNode?.name ?? '—'}
                  </div>
                </div>
              </div>

              {/* ── Node selector bar ── */}
              {nodes.length > 0 && (
                <div className="osen-node-bar osen-section">
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Select Node:</span>
                  {nodes.map(n => (
                    <button
                      key={n.id}
                      className={`osen-node-pill ${selectedNodeId === n.id ? 'active' : ''}`}
                      onClick={() => setSelectedNodeId(n.id)}
                    >
                      <Activity size={11} />
                      {n.name}
                    </button>
                  ))}
                  {selectedNode && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div className="osen-mode-badge" style={{ margin: 0, color: 'var(--ogs)', borderColor: 'rgba(25,135,84,0.15)', background: 'rgba(25,135,84,0.08)' }}>
                        <Activity size={11} /> {selectedNode.health_score ?? 100}% Health
                      </div>
                      <div className="osen-mode-badge" style={{ margin: 0, color: 'var(--oi)', borderColor: 'rgba(13,202,240,0.15)', background: 'rgba(13,202,240,0.08)' }}>
                        {selectedNode.is_charging ? <Zap size={11} color="#fbbf24" /> : <Battery size={11} />} {selectedNode.battery_level ?? 100}%
                      </div>
                      {selectedNode.control_mode && (
                        <div className="osen-mode-badge" style={{ margin: 0 }}>
                          ⚡ {selectedNode.control_mode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Main content ── */}
              {loading ? (
                <div className="osen-state-center">Loading nodes…</div>
              ) : nodes.length === 0 ? (
                <div className="osen-empty-card">
                  <p>No nodes found. Add a node in Node Management to get started.</p>
                </div>
              ) : (
                <>
                  {/* Row 1: Map + Action Window */}
                  <div className="osen-grid-2 osen-section">
                    <div className="osen-card">
                      <div className="osen-card-inner" style={{ padding: 0 }}>
                        <div className="osen-card-header" style={{ padding: '0.85rem 1.25rem' }}>
                          <span className="osen-card-title">
                            <span className="osen-card-title-dot" />
                            Geospatial Node Map
                          </span>
                          <span className="osen-badge osen-badge-success">{nodes.length} nodes</span>
                        </div>
                        <div style={{ padding: '0 1.25rem 1.25rem' }}>
                          <NodeMap
                            nodes={nodes}
                            latestReadings={latestReadings}
                            selectedNodeId={selectedNodeId}
                            onSelectNode={setSelectedNodeId}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="osen-card">
                      <div className="osen-card-inner" style={{ padding: 0 }}>
                        <div className="osen-card-header" style={{ padding: '0.85rem 1.25rem' }}>
                          <span className="osen-card-title">
                            <span className="osen-card-title-dot" style={{ background: currentReading?.relay_state ? 'var(--ogd)' : 'var(--ogs)' }} />
                            Action Window
                          </span>
                          {currentReading?.relay_state
                            ? <span className="osen-badge osen-badge-danger">Action ON</span>
                            : <span className="osen-badge osen-badge-muted"><strong style={{ fontWeight: 800 }}>time: {uptimeStr}</strong></span>}
                        </div>
                        <div style={{ padding: '0 1.25rem 1.25rem' }}>
                          <ActionWindow
                            classifierLabel={currentReading?.classifier_label}
                            isRelayOn={currentReading?.relay_state}
                            isGoodAqi={currentReading?.aqi <= 100}
                            aqi={currentReading?.aqi}
                            reason={currentReading?.action_reason || (currentReading?.relay_state ? "Action running" : "Standby (Action Paused)")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Vitals 4-up */}
                  <div className="osen-grid-4 osen-section">
                    {/* AQI */}
                    <div className="osen-card">
                      <div className="osen-card-inner">
                        <div className="osen-card-header">
                          <span className="osen-card-title"><span className="osen-card-title-dot" style={{ background: '#ffc107' }} />AQI</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                    </div>

                    {/* Action */}
                    <div className="osen-card">
                      <div className="osen-card-inner">
                        <div className="osen-card-header">
                          <span className="osen-card-title"><span className="osen-card-title-dot" style={{ background: 'var(--ogd)' }} />Action</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '140px', alignItems: 'center' }}>
                          {(() => {
                            if (!currentReading) return <div className="osen-state-center">No Data</div>;

                            if (!currentReading.relay_state) {
                              const isGood = currentReading?.aqi <= 100;
                              return (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isGood ? 'var(--ogs)' : 'var(--ow)' }}>
                                    {isGood ? 'Monitoring' : 'Standby'}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--ts)', marginTop: 4 }}>
                                    {isGood ? 'Good AQI — No action needed' : 'Action paused for AI intelligence'}
                                  </div>
                                </div>
                              );
                            }

                            let actionName = "Mitigation Active";
                            let props = [];

                            if (currentReading.classifier_label === 'construction_dust') {
                              actionName = "Mist Cannon Actuated";
                              const diff = Math.max(0, currentReading.pm10_corrected - (selectedNode?.pm10_threshold || 100));
                              const etaMins = Math.max(1, Math.round(diff / 0.5 / 60)); // ~0.5 ug/s suppression
                              props = [
                                { label: "Pressure", value: "150 Bar" },
                                { label: "Flow Rate", value: "45 L/min" },
                                { label: "Est. Stop In", value: `~${etaMins} min` }
                              ];
                            } else if (currentReading.classifier_label === 'vehicle_combustion') {
                              const isSevere = currentReading.aqi > 200;
                              actionName = isSevere ? "Traffic Re-routing (Heavy)" : "Route Advisory (Light)";
                              props = [
                                { label: "Signal Mode", value: isSevere ? "Red-Wave (HGV)" : "Yellow-Wave" },
                                { label: "Detour", value: isSevere ? `Active (${currentReading.intensity || 85}%)` : "Advisory Only" },
                                { label: "Clearance ETA", value: `~${currentReading.duration_min || 2} mins` }
                              ];
                            } else if (currentReading.classifier_label === 'waste_burning') {
                              const isSevere = currentReading.aqi > 200;
                              actionName = isSevere ? "Multi-Unit Dispatch" : "Inspector Dispatched";
                              props = [
                                { label: "Priority", value: isSevere ? `CRITICAL (${currentReading.intensity || 100}%)` : `MEDIUM (${currentReading.intensity || 50}%)` },
                                { label: "Units", value: isSevere ? "2 Engines" : "1 Inspector" },
                                { label: "ETA", value: `< ${currentReading.duration_min || 5} min` }
                              ];
                            } else {
                              props = [{ label: "Status", value: "Running" }];
                            }

                            return (
                              <div style={{ width: '100%', padding: '0 0.5rem' }}>
                                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--ogd)', lineHeight: 1.2 }}>
                                    {actionName.toUpperCase()}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--ts)', marginTop: 2, textTransform: 'uppercase' }}>
                                    Target: {currentReading.classifier_label.replace(/_/g, ' ')}
                                  </div>
                                </div>
                                <div style={{ background: 'rgba(220,53,69,0.05)', borderRadius: 'var(--or)', padding: '0.75rem', border: '1px solid rgba(220,53,69,0.2)' }}>
                                  {props.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i === props.length - 1 ? 0 : 6 }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--ts)', fontWeight: 600 }}>{p.label}</span>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--tp)', fontWeight: 700 }}>{p.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Dust Suppressed */}
                    <div className="osen-card">
                      <div className="osen-card-inner">
                        <div className="osen-card-header">
                          <span className="osen-card-title"><span className="osen-card-title-dot" style={{ background: 'var(--oi)' }} />Impact</span>
                        </div>
                        <div style={{ textAlign: 'center', paddingTop: 8 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Dust Suppressed</div>
                          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--oi)', lineHeight: 1 }}>{dustSuppressedKg}</div>
                          <div style={{ fontSize: '1rem', color: 'var(--ts)', fontWeight: 600, marginTop: 4 }}>gram</div>
                        </div>
                      </div>
                    </div>

                    {/* Classifier */}
                    <div className="osen-card">
                      <div className="osen-card-inner">
                        <div className="osen-card-header">
                          <span className="osen-card-title"><span className="osen-card-title-dot" style={{ background: '#f59e0b' }} />AI Source</span>
                        </div>
                        {currentReading?.aqi > 50 && currentReading?.classifier_label ? (
                          <>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: classifierColors[currentReading.classifier_label] || 'var(--tp)', marginBottom: 10 }}>
                              {currentReading.classifier_label.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--ts)', marginBottom: 5 }}>
                                <span>Confidence</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--tp)', fontWeight: 600 }}>
                                  {((currentReading.classifier_confidence || 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="osen-confidence-bar-bg">
                                <div
                                  className="osen-confidence-bar-fill"
                                  style={{
                                    width: `${(currentReading.classifier_confidence || 0) * 100}%`,
                                    background: classifierColors[currentReading.classifier_label] || 'var(--op)'
                                  }}
                                />
                              </div>
                            </div>
                            <hr className="osen-divider" />
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ts)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI PM10 Forecast</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              {[['10m', currentReading?.forecast_10m], ['20m', currentReading?.forecast_20m], ['30m', currentReading?.forecast_30m]].map(([label, val]) => (
                                <div key={label} className="osen-inline-stat">
                                  <div className="osen-inline-stat-label">+{label}</div>
                                  <div className="osen-inline-stat-val">{val?.toFixed(0) ?? '—'}</div>
                                  <div className="osen-inline-stat-label">µg</div>
                                </div>
                              ))}
                            </div>
                            <div className="osen-ai-chip">
                              {currentReading?.relay_state
                                ? "🤖 Autonomous intervention active."
                                : "🤖 AI evaluating mitigation strategy..."}
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ogs)' }}>Monitoring</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--ts)', marginTop: 4 }}>Good AQI — No classification required</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Live Readings Card */}
                  <div className="osen-card osen-section">
                    <div className="osen-card-inner">
                      <div className="osen-card-header">
                        <span className="osen-card-title"><span className="osen-card-title-dot" />PM Readings</span>
                        <span className="osen-badge osen-badge-muted" style={{ fontFamily: 'monospace' }}>
                          {currentReading ? new Date(currentReading.timestamp).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                      <LiveReadingsCard reading={currentReading} />
                    </div>
                  </div>

                  {/* Row 3.5: Automation Event Log */}
                  <div className="osen-card osen-section">
                    <div className="osen-card-inner" style={{ padding: 0 }}>
                      <div className="osen-card-header" style={{ padding: '0.85rem 1.25rem', marginBottom: 0 }}>
                        <span className="osen-card-title">
                          <span className="osen-card-title-dot" style={{ background: '#9333ea' }} />
                          Automation Event Log
                        </span>
                        <span className="osen-badge osen-badge-success">Live Tracking</span>
                      </div>
                      <div style={{ padding: '0 1.25rem' }}>
                        {eventLogs.length > 0 ? eventLogs.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 0', borderBottom: i === eventLogs.length - 1 ? 'none' : '1px solid var(--be)' }}>
                            <div style={{ minWidth: 70, fontSize: '0.75rem', color: 'var(--ts)' }}>
                              {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--tp)', fontWeight: 500 }}>
                                {r.relay_state
                                  ? `Relay triggered ON at ${selectedNode?.name}`
                                  : `Relay reverted to STANDBY at ${selectedNode?.name}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--ts)', marginTop: 2 }}>
                                Source: <strong style={{ color: 'var(--op)' }}>{r.classifier_label?.replace(/_/g, ' ') || 'Unknown'}</strong> · PM10: {r.pm10_corrected?.toFixed(1) || '—'} µg/m³
                              </div>
                            </div>
                            <div>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: r.relay_state ? 'rgba(220,53,69,0.1)' : 'rgba(25,135,84,0.1)',
                                color: r.relay_state ? 'var(--ogd)' : 'var(--ogs)'
                              }}>
                                {r.relay_state ? 'ACTION' : 'CLEARED'}
                              </span>
                            </div>
                          </div>
                        )) : (
                          <div style={{ padding: '1rem 0', fontSize: '0.85rem', color: 'var(--ts)' }}>No automation events yet for this node.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Timeline */}
                  <div className="osen-card osen-section">
                    <div className="osen-card-inner">
                      <div className="osen-card-header">
                        <span className="osen-card-title"><span className="osen-card-title-dot" style={{ background: 'var(--ogs)' }} />PM10 Timeline</span>
                        {selectedNode?.pm10_threshold && (
                          <span className="osen-badge osen-badge-muted">Threshold: {selectedNode.pm10_threshold} µg/m³</span>
                        )}
                      </div>
                      <TimelineChart readings={readings} pm10Threshold={selectedNode?.pm10_threshold} />
                    </div>
                  </div>

                  {/* Row 5: Recent Readings / Data Quality tabs */}
                  <div className="osen-card osen-section" style={{ padding: 0 }}>
                    <div className="osen-tab-bar" style={{ padding: '0 1.25rem' }}>
                      <button className={`osen-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>Recent Readings</button>
                      <button className={`osen-tab ${tab === 'quality' ? 'active' : ''}`} onClick={() => setTab('quality')}>Data Quality Panel</button>
                      <button className={`osen-tab ${tab === 'external' ? 'active' : ''}`} onClick={() => setTab('external')}>External Services</button>
                    </div>
                    <div style={{ padding: (tab === 'external') ? 0 : '1.25rem' }}>
                      {tab === 'quality' ? (
                        <DataQualityPanel readings={readings} />
                      ) : tab === 'external' ? (
                        <div>External systems feature temporarily disabled</div>
                      ) : (
                        <div className="osen-table-wrap">
                          <table className="osen-table">
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
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap', color: 'var(--ts)' }}>
                                    {new Date(r.timestamp).toLocaleTimeString()}
                                  </td>
                                  <td>{r.pm1_0_raw ?? '—'}</td>
                                  <td>{r.pm2_5_raw ?? '—'}</td>
                                  <td style={{ color: r.quality_flags?.pm10 === 'failed_read' ? 'var(--ogd)' : 'inherit' }}>
                                    {r.pm10_raw ?? <span style={{ color: 'var(--ogd)' }}>NULL</span>}
                                  </td>
                                  <td style={{ color: 'var(--oi)', fontWeight: 600 }}>{r.pm10_corrected?.toFixed(1) ?? '—'}</td>
                                  <td style={{ fontWeight: 700 }}>{r.aqi ?? '—'}</td>
                                  <td style={{ fontSize: '0.75rem' }}>
                                    {r.classifier_label
                                      ? <span style={{ color: classifierColors[r.classifier_label], fontWeight: 600 }}>{r.classifier_label.replace(/_/g, ' ')}</span>
                                      : '—'}
                                  </td>
                                  <td>
                                    <span className={`osen-badge ${r.relay_state ? 'osen-badge-danger' : 'osen-badge-muted'}`}>
                                      {r.relay_state ? 'ON' : 'OFF'}
                                    </span>
                                  </td>
                                  <td><QualityFlagBadge flags={r.quality_flags || {}} compact /></td>
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
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
