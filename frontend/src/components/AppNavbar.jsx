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
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1780px] mx-auto px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <Radio className="text-white" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                SourceSense <span className="text-blue-700 font-mono text-xs px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">v3.2</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                IIT Bombay Techfest
              </span>
            </div>
            <p className="text-[11px] text-slate-500 tracking-normal font-medium m-0">
              Autonomous Environmental Remediation Platform
            </p>
          </div>
        </div>

        {/* Center: Clean Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-normal transition-all ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Telemetry Strip */}
        <div className="flex items-center gap-2.5">
          {/* Quick Node Switcher */}
          {nodes.length > 0 && onSelectNode && (
            <div className="relative flex items-center">
              <span className="text-[11px] text-slate-500 font-medium mr-2 hidden md:inline">Node:</span>
              <div className="relative">
                <select
                  value={selectedNodeId || ''}
                  onChange={(e) => onSelectNode(Number(e.target.value))}
                  className="tech-select font-mono text-xs pr-7 bg-white border-slate-300 text-slate-800 cursor-pointer appearance-none py-1 pl-2.5 shadow-sm"
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

          {/* Active Relays Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs shadow-sm ${
            activeRelaysCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <Zap size={13} className={activeRelaysCount > 0 ? 'text-rose-600' : 'text-slate-400'} />
            <span className="text-[11px] font-medium">Actuators:</span>
            <span className={`font-mono font-bold text-[11px] ${activeRelaysCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {activeRelaysCount} ENGAGED
            </span>
          </div>

          {/* WebSocket Live Telemetry Status */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs shadow-sm">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-500 text-[11px] font-medium">Stream:</span>
            <span className={`font-mono text-[11px] font-semibold ${wsConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {wsConnected ? 'LIVE (18ms)' : 'OFFLINE'}
            </span>
          </div>

          {/* Local Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-600 shadow-sm">
            <Clock size={12} className="text-blue-600" />
            <span>{timeStr || '00:00:00'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
