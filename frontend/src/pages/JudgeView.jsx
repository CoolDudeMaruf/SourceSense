import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere } from '@react-three/drei';
import { Activity, AlertTriangle, ShieldCheck, Server, Leaf, Settings2, Sliders, CheckCircle, RefreshCcw, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import AppNavbar from '../components/AppNavbar';

// --- State Machine Interfaces & Logic ---
const NODE_STATES = {
  NORMAL: 'NORMAL',
  ACTIVE: 'ACTIVE',
  PENDING_ACTION: 'PENDING_ACTION',
  FAULT: 'FAULT',
};

const STATE_COLORS = {
  [NODE_STATES.NORMAL]: '#10B981', // Emerald
  [NODE_STATES.ACTIVE]: '#0284C7', // Blue
  [NODE_STATES.PENDING_ACTION]: '#D97706', // Amber
  [NODE_STATES.FAULT]: '#DC2626', // Crimson
};

const initialNodes = [
  { id: 'N-01', location: 'Gazipur City', state: NODE_STATES.NORMAL, pm25: 12, pm10: 25, flow: 0, dustRemoved: 1.2 },
  { id: 'N-02', location: 'Tongi', state: NODE_STATES.ACTIVE, pm25: 45, pm10: 80, flow: 120, dustRemoved: 4.5 },
  { id: 'N-03', location: 'Narayanganj City', state: NODE_STATES.PENDING_ACTION, pm25: 65, pm10: 110, flow: 0, dustRemoved: 2.1 },
  { id: 'N-04', location: 'Savar', state: NODE_STATES.NORMAL, pm25: 14, pm10: 28, flow: 0, dustRemoved: 1.4 },
  { id: 'N-05', location: 'Sreepur', state: NODE_STATES.NORMAL, pm25: 15, pm10: 30, flow: 0, dustRemoved: 1.5 },
  { id: 'N-06', location: 'Narsingdi', state: NODE_STATES.NORMAL, pm25: 18, pm10: 35, flow: 0, dustRemoved: 1.8 },
  { id: 'N-07', location: 'Manikganj', state: NODE_STATES.NORMAL, pm25: 10, pm10: 20, flow: 0, dustRemoved: 1.0 },
  { id: 'N-08', location: 'Tangail', state: NODE_STATES.NORMAL, pm25: 22, pm10: 45, flow: 0, dustRemoved: 2.2 },
  { id: 'N-09', location: 'Mirpur Housing', state: NODE_STATES.NORMAL, pm25: 25, pm10: 50, flow: 0, dustRemoved: 2.5 },
  { id: 'N-10', location: 'Azimpur', state: NODE_STATES.NORMAL, pm25: 20, pm10: 40, flow: 0, dustRemoved: 2.0 },
  { id: 'N-11', location: 'Tejgaon Industrial', state: NODE_STATES.NORMAL, pm25: 30, pm10: 60, flow: 0, dustRemoved: 3.0 },
  { id: 'N-12', location: 'Kalyanpur', state: NODE_STATES.NORMAL, pm25: 14, pm10: 28, flow: 0, dustRemoved: 1.4 },
  { id: 'N-13', location: 'Motijheel', state: NODE_STATES.NORMAL, pm25: 16, pm10: 32, flow: 0, dustRemoved: 1.6 },
  { id: 'N-14', location: 'Hazaribagh', state: NODE_STATES.NORMAL, pm25: 35, pm10: 70, flow: 0, dustRemoved: 3.5 },
  { id: 'N-15', location: 'Mohakhali', state: NODE_STATES.NORMAL, pm25: 19, pm10: 38, flow: 0, dustRemoved: 1.9 },
  { id: 'N-16', location: 'Uttara Sectors', state: NODE_STATES.NORMAL, pm25: 21, pm10: 42, flow: 0, dustRemoved: 2.1 },
  { id: 'N-17', location: 'Khilgaon', state: NODE_STATES.NORMAL, pm25: 17, pm10: 34, flow: 0, dustRemoved: 1.7 },
  { id: 'N-18', location: 'Old Dhaka', state: NODE_STATES.NORMAL, pm25: 28, pm10: 56, flow: 0, dustRemoved: 2.8 },
  { id: 'N-19', location: 'Badda', state: NODE_STATES.NORMAL, pm25: 24, pm10: 48, flow: 0, dustRemoved: 2.4 },
  { id: 'N-20', location: 'Malibagh', state: NODE_STATES.NORMAL, pm25: 23, pm10: 46, flow: 0, dustRemoved: 2.3 },
  { id: 'N-21', location: 'Gabtoli', state: NODE_STATES.NORMAL, pm25: 26, pm10: 52, flow: 0, dustRemoved: 2.6 },
  { id: 'N-22', location: 'Jatrabari', state: NODE_STATES.NORMAL, pm25: 29, pm10: 58, flow: 0, dustRemoved: 2.9 },
  { id: 'N-23', location: 'Paltan', state: NODE_STATES.NORMAL, pm25: 13, pm10: 26, flow: 0, dustRemoved: 1.3 },
  { id: 'N-24', location: 'Bashundhara', state: NODE_STATES.NORMAL, pm25: 11, pm10: 22, flow: 0, dustRemoved: 1.1 },
  { id: 'N-25', location: 'Banani', state: NODE_STATES.NORMAL, pm25: 27, pm10: 54, flow: 0, dustRemoved: 2.7 },
];

// --- 3D Digital Twin Component ---
const DigitalTwin = ({ nodeState, overrideLevel }) => {
  const meshRef = useRef();
  const particleRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      if (nodeState === NODE_STATES.FAULT) {
        meshRef.current.rotation.x = Math.sin(t * 10) * 0.1;
      } else {
        meshRef.current.rotation.y = t * 0.5;
      }
    }
    if (particleRef.current) {
      particleRef.current.rotation.y = -t;
      particleRef.current.scale.setScalar(
        nodeState === NODE_STATES.ACTIVE
          ? 1 + (overrideLevel / 100) * 0.5 + Math.sin(t * 5) * 0.1
          : nodeState === NODE_STATES.FAULT
          ? 0
          : 0.1
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 15, 10]} intensity={1.3} />

      {/* Hardware Base */}
      <Box ref={meshRef} args={[2, 2, 2]} wireframe={nodeState === NODE_STATES.FAULT}>
        <meshStandardMaterial
          color={STATE_COLORS[nodeState]}
          metalness={0.6}
          roughness={0.3}
        />
      </Box>

      {/* Mist Cloud in ACTIVE state */}
      {nodeState === NODE_STATES.ACTIVE && (
        <Sphere ref={particleRef} args={[1.5, 32, 32]}>
          <meshStandardMaterial
            color="#bae6fd"
            transparent
            opacity={0.4}
            roughness={0.9}
          />
        </Sphere>
      )}
    </>
  );
};

export default function JudgeView() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNode, setSelectedNode] = useState(nodes[1]);
  const [overrideLevel, setOverrideLevel] = useState(50);

  // Derived stats
  const totalDust = nodes.reduce((acc, n) => acc + n.dustRemoved, 0).toFixed(2);
  const activeCount = nodes.filter((n) => n.state === NODE_STATES.ACTIVE).length;
  const faultCount = nodes.filter((n) => n.state === NODE_STATES.FAULT).length;

  // Mock Timeseries Data
  const sparklineData = Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    pm25: selectedNode.state === NODE_STATES.FAULT ? 0 : selectedNode.pm25 + Math.random() * 8 - 4,
    pm10: selectedNode.state === NODE_STATES.FAULT ? 0 : selectedNode.pm10 + Math.random() * 12 - 6,
  }));

  const handleNodeClick = (n) => {
    setSelectedNode(n);
  };

  const triggerFault = () => {
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, state: NODE_STATES.FAULT, pm25: 0, pm10: 0, flow: 0 } : n
    );
    setNodes(updated);
    setSelectedNode(updated.find((n) => n.id === selectedNode.id));
  };

  const triggerActive = () => {
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, state: NODE_STATES.ACTIVE, pm25: 45, pm10: 80, flow: 120 } : n
    );
    setNodes(updated);
    setSelectedNode(updated.find((n) => n.id === selectedNode.id));
  };

  const triggerNormal = () => {
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, state: NODE_STATES.NORMAL, pm25: 15, pm10: 28, flow: 0 } : n
    );
    setNodes(updated);
    setSelectedNode(updated.find((n) => n.id === selectedNode.id));
  };

  const triggerPending = () => {
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, state: NODE_STATES.PENDING_ACTION, pm25: 65, pm10: 110, flow: 0 } : n
    );
    setNodes(updated);
    setSelectedNode(updated.find((n) => n.id === selectedNode.id));
  };

  const resetAllNodes = () => {
    setNodes(initialNodes);
    setSelectedNode(initialNodes[1]);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <AppNavbar
        nodes={nodes.map((n) => ({ id: n.id, name: `${n.id} - ${n.location}` }))}
        selectedNodeId={selectedNode.id}
        onSelectNode={(id) => {
          const match = nodes.find((n) => n.id === id);
          if (match) setSelectedNode(match);
        }}
        activeRelaysCount={activeCount}
      />

      <main className="flex-1 max-w-[1780px] w-full mx-auto px-4 py-4 space-y-4">
        {/* Judge Protocol Banner */}
        <div className="tech-card p-4 bg-white border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900">
                  IIT BOMBAY TECHFEST — EVALUATION SUITE
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  JUDGE SANDBOX
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Live State-Machine Simulation, Fault Injection Testing, and Actuation Verification Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={resetAllNodes} className="tech-btn text-xs">
              <RefreshCcw size={13} />
              <span>Reset Sandbox</span>
            </button>
          </div>
        </div>

        {/* Fleet Status KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">STATE MACHINE HEALTH</div>
              <div className="text-xl font-mono font-bold text-emerald-600 mt-0.5">
                {faultCount === 0 ? 'NOMINAL (100%)' : `${faultCount} FAULTED`}
              </div>
            </div>
            <Server size={18} className="text-emerald-600" />
          </div>

          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">ACTIVE ACTUATORS</div>
              <div className="text-xl font-mono font-bold text-blue-600 mt-0.5">
                {activeCount} / {nodes.length}
              </div>
            </div>
            <Activity size={18} className="text-blue-600" />
          </div>

          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">SIMULATED EXTRACTION</div>
              <div className="text-xl font-mono font-bold text-amber-600 mt-0.5">
                {totalDust} kg
              </div>
            </div>
            <Leaf size={18} className="text-amber-600" />
          </div>

          <div className="tech-card p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">INSPECTED NODE</div>
              <div className="text-xl font-mono font-bold text-slate-900 mt-0.5">
                {selectedNode.id}
              </div>
            </div>
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{
                backgroundColor: STATE_COLORS[selectedNode.state],
                boxShadow: `0 0 8px ${STATE_COLORS[selectedNode.state]}`,
              }}
            />
          </div>
        </div>

        {/* Main Split: Topology Grid + Node Inspector Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Spatial Node Matrix & Telemetry */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Spatial Grid */}
            <div className="tech-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wide">
                  25-NODE URBAN TOPOLOGY (CLICK TO INSPECT)
                </span>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> NORMAL
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600" /> ACTIVE
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> PENDING
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-600" /> FAULT
                  </span>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-5 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {nodes.map((node) => {
                  const isSelected = selectedNode.id === node.id;
                  const stateColor = STATE_COLORS[node.state];

                  return (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">{node.id}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: stateColor,
                            boxShadow: `0 0 6px ${stateColor}`,
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate">{node.location}</div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">PM10:</span>
                        <span className="text-slate-800 font-bold">{node.pm10}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sparkline Telemetry */}
            <div className="tech-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wide">
                  REAL-TIME TELEMETRY STREAM ({selectedNode.id} - {selectedNode.location})
                </span>
                <span className="text-xs font-mono text-blue-700 font-medium">PM2.5 (Blue) vs PM10 (Amber)</span>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="judgePm25" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="judgePm10" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}µg`} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="pm25" stroke="#0284C7" fill="url(#judgePm25)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="pm10" stroke="#D97706" fill="url(#judgePm10)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Node Inspector Drawer & Digital Twin */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="tech-card p-4 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">INSPECTED NODE</div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {selectedNode.id} — {selectedNode.location}
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase"
                    style={{
                      color: STATE_COLORS[selectedNode.state],
                      borderColor: `${STATE_COLORS[selectedNode.state]}55`,
                      background: `${STATE_COLORS[selectedNode.state]}15`,
                    }}
                  >
                    {selectedNode.state}
                  </span>
                </div>

                {/* 3D WebGL Digital Twin */}
                <div className="h-[220px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative mb-4">
                  <Canvas camera={{ position: [0, 2, 5] }}>
                    <OrbitControls enableZoom={false} autoRotate={selectedNode.state !== NODE_STATES.FAULT} />
                    <DigitalTwin nodeState={selectedNode.state} overrideLevel={overrideLevel} />
                  </Canvas>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/90 border border-slate-200 font-mono text-[9px] text-blue-700 shadow-sm font-semibold">
                    DIGITAL TWIN SIMULATOR | 60 FPS
                  </div>
                </div>

                {/* Diagnostic Overrides */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Settings2 size={13} className="text-blue-700" />
                      Judge Override & Fault Injection
                    </span>
                    <span className="font-mono text-blue-700">{overrideLevel}% Flow</span>
                  </div>

                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overrideLevel}
                      onChange={(e) => setOverrideLevel(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={triggerActive}
                      className="tech-btn tech-btn-primary text-xs justify-center py-2"
                    >
                      <Zap size={12} />
                      <span>Trigger Active (Mist)</span>
                    </button>

                    <button
                      onClick={triggerPending}
                      className="tech-btn text-xs justify-center py-2 text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
                    >
                      <span>Simulate Delay</span>
                    </button>

                    <button
                      onClick={triggerFault}
                      className="tech-btn tech-btn-danger text-xs justify-center py-2"
                    >
                      <AlertTriangle size={12} />
                      <span>Inject Fault (Lock)</span>
                    </button>

                    <button
                      onClick={triggerNormal}
                      className="tech-btn text-xs justify-center py-2 text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                    >
                      <CheckCircle size={12} />
                      <span>Restore Normal</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono text-center pt-3 border-t border-slate-100">
                Safety interlock halts physical relays when FAULT is confirmed.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
