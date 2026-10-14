import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Layers,
  FileText,
  Sliders,
  Radio,
  Zap,
  Clock,
  ChevronDown
} from 'lucide-react';

export default function AppNavbar({
  nodes = [],
  selectedNodeId,
  onSelectNode,
  wsConnected = true,
  activeRelaysCount = 0
}) {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { path: '/', label: 'Command Matrix', icon: Activity },
    { path: '/nodes', label: 'Nodes & Topology', icon: Layers },
    { path: '/events', label: 'Mitigation Ledger', icon: FileText },
    { path: '/judge', label: 'Judge Suite', icon: Sliders, badge: 'FINAL' },
  ];

  return (
    <header className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)]">
      <div className="max-w-[1780px] mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-3">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 border border-white/40 ring-1 ring-blue-500/20">
            <Radio className="text-white" size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[15px] tracking-tight text-slate-900 flex items-center gap-1.5">
                SourceSense <span className="text-blue-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/80">v3.2</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                IIT Bombay Techfest
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 tracking-normal font-medium m-0 flex items-center gap-1.5">
              <span>Autonomous Environmental Remediation</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-mono text-slate-400">Cyber-Physical SCADA</span>
            </p>
          </div>
        </div>

        {/* Center: Frosted Segmented Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100/70 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-blue-600 text-white tracking-wider shadow-sm">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Telemetry Cluster */}
        <div className="flex items-center gap-2.5">
          {/* Quick Node Switcher with Glass Bevel */}
          {nodes.length > 0 && onSelectNode && (
            <div className="relative flex items-center">
              <span className="text-[11px] text-slate-500 font-medium mr-2 hidden md:inline">Node:</span>
              <div className="relative">
                <select
                  value={selectedNodeId || ''}
                  onChange={(e) => onSelectNode(Number(e.target.value))}
                  className="font-mono text-xs pr-7 bg-white/90 backdrop-blur-md border border-slate-300/80 text-slate-800 cursor-pointer appearance-none py-1 pl-2.5 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Active Relays Status Pill with Pulse Glow */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-sm transition-all duration-300 backdrop-blur-md ${
            activeRelaysCount > 0
              ? 'bg-rose-50/90 border-rose-200 text-rose-700 shadow-rose-500/10 ring-1 ring-rose-500/20'
              : 'bg-slate-50/90 border-slate-200/80 text-slate-600'
          }`}>
            <Zap size={13} className={activeRelaysCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'} />
            <span className="text-[11px] font-medium">Actuators:</span>
            <span className={`font-mono font-bold text-[11px] ${activeRelaysCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {activeRelaysCount} {activeRelaysCount > 0 ? 'ENGAGED' : 'ARMED'}
            </span>
          </div>

          {/* WebSocket Live Telemetry Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50/90 backdrop-blur-md border border-slate-200/80 text-xs shadow-sm">
            <span className="relative flex h-2 w-2">
              {wsConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-500 text-[11px] font-medium">Telemetry:</span>
            <span className={`font-mono text-[11px] font-bold ${wsConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {wsConnected ? '1000ms LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Local / Atomic Synchronized Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 backdrop-blur-md border border-slate-200/80 font-mono text-[11px] text-slate-700 shadow-sm">
            <Clock size={12} className="text-blue-600" />
            <span>{timeStr || '00:00:00'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
