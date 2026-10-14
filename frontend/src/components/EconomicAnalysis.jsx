import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Cpu, Wifi, Zap, TrendingDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function EconomicAnalysis() {
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [reportRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/economics/report?network_size=28`),
          fetch(`${API_BASE}/api/v1/economics/tinyml-stats`)
        ]);
        
        if (reportRes.ok && statsRes.ok) {
          const reportData = await reportRes.json();
          const statsData = await statsRes.json();
          setReport(reportData);
          setStats(statsData);
        }
      } catch (err) {
        console.error("Error fetching economic data:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 font-mono text-xs">Simulating Economic Models & Edge ROI...</div>;
  }

  if (!report || !stats) {
    return <div className="p-8 text-center text-rose-500 font-mono text-xs">Failed to load economic model data.</div>;
  }

  // Formatting for currency
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'BDT', 
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(val);

  // Projection Data for Line Chart (Single Node)
  const projectionData = [0, 1, 2, 3, 4, 5].map(year => ({
    name: `Year ${year}`,
    Traditional: report.single_node.capex.traditional + (report.single_node.opex_annual.traditional * year),
    TinyML: report.single_node.capex.tinyml + (report.single_node.opex_annual.tinyml * year)
  }));

  // Bandwidth Data for Bar Chart
  const bandwidthData = [
    { name: 'Raw Telemetry', MB_Per_Day: report.bandwidth.raw_mb_per_day },
    { name: 'TinyML Edge Events', MB_Per_Day: report.bandwidth.edge_mb_per_day }
  ];

  return (
    <div className="space-y-4">
      {/* Top Level Metric Cards (4 Frosted Glass Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">CAPEX SAVINGS</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={14} />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
            {formatCurrency(report.network_totals.capex_savings)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">On 28 node urban deployment</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">BANDWIDTH REDUCTION</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wifi size={14} />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-blue-600 mt-1">
            {report.bandwidth.reduction_percentage}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Edge AI vs continuous raw telemetry</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">ENERGY EFFICIENCY</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap size={14} />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1">
            {report.energy.reduction_percentage}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ultra-low sleep duty-cycle optimization</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">5-YEAR TCO SAVINGS</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingDown size={14} />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">
            {formatCurrency(report.network_totals.projection_5yr_savings)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">On {report.network_size} node fleet operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Cumulative Cost Chart */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Cumulative 5-Year TCO Cost (Single Node)
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              TinyML ROI: 7.2x
            </span>
          </div>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.7)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(value) => `৳${value / 100000}L`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="Traditional" stroke="#ef4444" strokeWidth={2.5} dot={{r: 3}} activeDot={{r: 5}} />
                <Line type="monotone" dataKey="TinyML" stroke="#10b981" strokeWidth={2.5} dot={{r: 3}} activeDot={{r: 5}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 flex flex-col">
          {/* Bandwidth Chart */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Daily Bandwidth Usage per Node (MB)
              </span>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                -96% Cloud Payload
              </span>
            </div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandwidthData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.7)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={110} tick={{ fontSize: 10 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="MB_Per_Day" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TinyML Specs */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Cpu size={13} className="text-blue-600" />
                TinyML Edge Model Specifications
              </span>
              <span className="text-[10px] font-mono text-slate-500">C Header / Random Forest</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <p className="text-slate-400 text-[10px]">MODEL SIZE</p>
                <p className="text-slate-900 font-extrabold text-sm mt-0.5">{stats.model_size_bytes / 1024} KB</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <p className="text-slate-400 text-[10px]">INFERENCE</p>
                <p className="text-blue-700 font-extrabold text-sm mt-0.5">{stats.inference_time_ms} ms</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <p className="text-slate-400 text-[10px]">PEAK RAM</p>
                <p className="text-slate-900 font-extrabold text-sm mt-0.5">{stats.peak_ram_bytes / 1024} KB</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <p className="text-slate-400 text-[10px]">POWER DRAW</p>
                <p className="text-emerald-700 font-extrabold text-sm mt-0.5">{stats.power_draw_inference_mw} mW</p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              The compiled model (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">model.h</code>) executes continuous inferencing directly on an \$3 ESP8266/ESP32 edge microcontroller, enabling instantaneous offline mitigation triggers during network outages.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
