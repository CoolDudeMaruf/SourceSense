import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

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
    return <div className="p-8 text-center text-gray-400">Loading Economic Models...</div>;
  }

  if (!report || !stats) {
    return <div className="p-8 text-center text-red-400">Failed to load economic data.</div>;
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
    <div className="space-y-6">
      
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">CAPEX Savings</h3>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {formatCurrency(report.network_totals.capex_savings)}
          </div>
          <p className="text-gray-400 text-sm">On 28 node deployment</p>
        </div>
        
        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">Bandwidth Reduction</h3>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {report.bandwidth.reduction_percentage}%
          </div>
          <p className="text-gray-400 text-sm">Edge AI vs Raw Cloud Streaming</p>
        </div>
        
        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">Energy Efficiency</h3>
          <div className="text-3xl font-bold text-yellow-400 mb-2">
            {report.energy.reduction_percentage}%
          </div>
          <p className="text-gray-400 text-sm">Solar vs Grid Power</p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">5-Year TCO Savings</h3>
          <div className="text-3xl font-bold text-indigo-400 mb-2">
            {formatCurrency(report.network_totals.projection_5yr_savings)}
          </div>
          <p className="text-gray-400 text-sm">On {report.network_size} node deployment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cumulative Cost Chart */}
        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Cumulative 5-Year Cost (Single Node)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
                <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} tickFormatter={(value) => `৳${value / 100000}L`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="Traditional" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="TinyML" stroke="#10B981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          {/* Bandwidth Chart */}
          <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl flex-1">
            <h3 className="text-lg font-semibold text-white mb-6">Daily Bandwidth Usage per Node (MB)</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandwidthData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  />
                  <Bar dataKey="MB_Per_Day" fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TinyML Specs */}
          <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">TinyML Edge Model Specs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Model Size</p>
                <p className="text-white font-mono">{stats.model_size_bytes / 1024} KB</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Inference Latency</p>
                <p className="text-white font-mono">{stats.inference_time_ms} ms</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">RAM Requirement</p>
                <p className="text-white font-mono">{stats.peak_ram_bytes / 1024} KB</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Power Draw (Inference)</p>
                <p className="text-white font-mono">{stats.power_draw_inference_mw} mW</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700/50 text-sm text-gray-400">
              <p>The exported C header (<code className="bg-gray-900 px-1 py-0.5 rounded text-gray-300">tinyml_model.h</code>) enables running the full Random Forest classifier directly on an \$8 ESP32 MCU, bypassing the cloud for continuous telemetry processing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
