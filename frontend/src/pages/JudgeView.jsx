import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { Activity, AlertTriangle, ShieldCheck, Server, Leaf, Settings2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// --- Part 2: State Machine Interfaces & Logic ---
const NODE_STATES = {
  NORMAL: 'NORMAL',
  ACTIVE: 'ACTIVE', 
  PENDING_ACTION: 'PENDING_ACTION',
  FAULT: 'FAULT'
};

const STATE_COLORS = {
  [NODE_STATES.NORMAL]: '#10B981', // Emerald
  [NODE_STATES.ACTIVE]: '#06B6D4', // Cyan
  [NODE_STATES.PENDING_ACTION]: '#F59E0B', // Amber
  [NODE_STATES.FAULT]: '#EF4444' // Crimson
};

// Mock initial nodes
const initialNodes = [
  { id: 'N-01', location: 'Main Gate', state: NODE_STATES.NORMAL, pm25: 12, pm10: 25, flow: 0, dustRemoved: 1.2 },
  { id: 'N-02', location: 'Assembly Area', state: NODE_STATES.ACTIVE, pm25: 45, pm10: 80, flow: 120, dustRemoved: 4.5 },
  { id: 'N-03', location: 'Exhaust Vent B', state: NODE_STATES.PENDING_ACTION, pm25: 65, pm10: 110, flow: 0, dustRemoved: 2.1 },
  { id: 'N-04', location: 'Chemical Storage', state: NODE_STATES.FAULT, pm25: 999, pm10: 999, flow: 0, dustRemoved: 0.8 },
];

// --- Part 3: 3D Digital Twin Component ---
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
        nodeState === NODE_STATES.ACTIVE ? 1 + (overrideLevel / 100) * 0.5 + Math.sin(t * 5) * 0.1 : 
        nodeState === NODE_STATES.FAULT ? 0 : 0.1
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Hardware Base */}
      <Box ref={meshRef} args={[2, 2, 2]} wireframe={nodeState === NODE_STATES.FAULT}>
        <meshStandardMaterial 
          color={STATE_COLORS[nodeState]} 
          emissive={STATE_COLORS[nodeState]}
          emissiveIntensity={nodeState === NODE_STATES.FAULT ? 0.8 : 0.2}
          transparent
          opacity={0.9}
        />
      </Box>

      {/* Dynamic Particles / Fog Ring */}
      {(nodeState === NODE_STATES.ACTIVE || nodeState === NODE_STATES.PENDING_ACTION) && (
        <Sphere ref={particleRef} args={[1.5, 32, 32]} position={[0, 1.5, 0]}>
          <MeshDistortMaterial 
            color="#06B6D4" 
            envMapIntensity={1} 
            clearcoat={1} 
            clearcoatRoughness={0.1} 
            metalness={0.8} 
            roughness={0.2} 
            distort={0.4} 
            speed={nodeState === NODE_STATES.ACTIVE ? 5 : 1}
            transparent
            opacity={nodeState === NODE_STATES.ACTIVE ? 0.6 : 0.2}
          />
        </Sphere>
      )}
    </>
  );
};

// --- Part 1 & 4: Main Dashboard Layout ---
export default function JudgeView() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNode, setSelectedNode] = useState(nodes[1]);
  const [overrideLevel, setOverrideLevel] = useState(50);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Derived stats
  const totalDust = nodes.reduce((acc, n) => acc + n.dustRemoved, 0).toFixed(2);
  const activeCount = nodes.filter(n => n.state === NODE_STATES.ACTIVE).length;
  const faultCount = nodes.filter(n => n.state === NODE_STATES.FAULT).length;

  // Mock Timeseries Data
  const sparklineData = Array.from({length: 20}).map((_, i) => ({
    time: i,
    pm25: selectedNode.state === NODE_STATES.FAULT ? 0 : selectedNode.pm25 + Math.random() * 10 - 5,
    pm10: selectedNode.state === NODE_STATES.FAULT ? 0 : selectedNode.pm10 + Math.random() * 15 - 7.5,
  }));

  const handleNodeClick = (n) => {
    setSelectedNode(n);
    setDrawerOpen(true);
  };

  const triggerFault = () => {
    const updated = nodes.map(n => n.id === selectedNode.id ? { ...n, state: NODE_STATES.FAULT, pm25: 0, pm10: 0 } : n);
    setNodes(updated);
    setSelectedNode(updated.find(n => n.id === selectedNode.id));
  };

  const triggerActive = () => {
     const updated = nodes.map(n => n.id === selectedNode.id ? { ...n, state: NODE_STATES.ACTIVE, pm25: 45, pm10: 80 } : n);
     setNodes(updated);
     setSelectedNode(updated.find(n => n.id === selectedNode.id));
  };

  return (
    <div style={{ backgroundColor: '#0B0F19', color: '#E2E8F0', minHeight: '100vh', padding: '24px', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Command Center <span style={{ color: '#06B6D4' }}>| IIT Techfest</span></h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.9rem' }}>Enterprise IoT Environmental Control</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatBadge icon={<Server size={16} color="#10B981" />} label="System Health" value={faultCount === 0 ? "99.9% Uptime" : "Warning"} />
          <StatBadge icon={<Activity size={16} color="#06B6D4" />} label="Active Nodes" value={`${activeCount}/${nodes.length}`} />
          <StatBadge icon={<Leaf size={16} color="#F59E0B" />} label="Dust Extracted" value={`${totalDust} kg`} />
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: drawerOpen ? '1fr 400px' : '1fr', gap: '24px', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Col: Macro View & Split Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
          
          {/* Spatial Map (Mocked) */}
          <GlassCard title="Spatial Node Map" style={{ flex: 1, minHeight: '300px' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              {/* Floorplan grid background */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              {/* Nodes */}
              {nodes.map((node, i) => {
                const positions = [ {top: '20%', left: '20%'}, {top: '50%', left: '40%'}, {top: '30%', left: '70%'}, {top: '70%', left: '80%'} ];
                const isSelected = selectedNode.id === node.id;
                return (
                  <div 
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    style={{
                      position: 'absolute',
                      ...positions[i],
                      cursor: 'pointer',
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelected ? 10 : 1
                    }}
                  >
                    <div style={{
                      width: isSelected ? '40px' : '24px',
                      height: isSelected ? '40px' : '24px',
                      borderRadius: '50%',
                      backgroundColor: STATE_COLORS[node.state],
                      boxShadow: `0 0 ${isSelected ? '20px' : '10px'} ${STATE_COLORS[node.state]}`,
                      border: `2px solid ${isSelected ? '#FFF' : 'transparent'}`,
                      transition: 'all 0.3s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {node.state === NODE_STATES.FAULT && <AlertTriangle size={14} color="#FFF" />}
                    </div>
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap', color: STATE_COLORS[node.state] }}>
                      {node.id}
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Split Telemetry */}
          <GlassCard title="Real-time Telemetry" style={{ height: '300px', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPm10" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => `${val}µg`} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="pm25" stroke="#06B6D4" fillOpacity={1} fill="url(#colorPm25)" isAnimationActive={false} />
                <Area type="monotone" dataKey="pm10" stroke="#F59E0B" fillOpacity={1} fill="url(#colorPm10)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

        </div>

        {/* Right Col: Inspection Drawer & 3D Twin */}
        {drawerOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
            
            <GlassCard title={`Node Inspector: ${selectedNode.id}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', background: `${STATE_COLORS[selectedNode.state]}20`, borderLeft: `4px solid ${STATE_COLORS[selectedNode.state]}`, borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color={STATE_COLORS[selectedNode.state]} />
                <span style={{ color: STATE_COLORS[selectedNode.state], fontWeight: 700, letterSpacing: '0.05em' }}>STATUS: {selectedNode.state}</span>
              </div>

              {/* 3D Canvas */}
              <div style={{ height: '250px', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                <Canvas camera={{ position: [0, 2, 5] }}>
                  <OrbitControls enableZoom={false} autoRotate={selectedNode.state !== NODE_STATES.FAULT} />
                  <DigitalTwin nodeState={selectedNode.state} overrideLevel={overrideLevel} />
                </Canvas>
                <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  WebGL Twin | FPS: 60
                </div>
              </div>

              {/* Manual Override & Diagnostics */}
              <div style={{ flex: 1, background: 'rgba(15,23,42,0.6)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '200px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings2 size={16} /> Diagnostic Overrides
                </h3>
                
                {selectedNode.state === NODE_STATES.FAULT ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', border: '1px dashed #EF4444' }}>
                    <p style={{ margin: 0, color: '#FCA5A5', fontSize: '0.8rem', marginBottom: '8px' }}>Safety Interlock Engaged. Automated triggers disabled.</p>
                    <button onClick={triggerActive} style={{ width: '100%', padding: '8px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Clear Fault & Reset</button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '8px' }}>
                        <span>Injection Slider (Flow Rate)</span>
                        <span style={{ fontFamily: 'monospace', color: '#06B6D4' }}>{overrideLevel}%</span>
                      </label>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={overrideLevel} 
                        onChange={e => setOverrideLevel(e.target.value)}
                        style={{ width: '100%', accentColor: '#06B6D4' }}
                      />
                    </div>
                    <button onClick={triggerFault} style={{ width: '100%', padding: '8px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                      Inject System Fault
                    </button>
                  </>
                )}
              </div>
            </GlassCard>
            
          </div>
        )}

      </div>
    </div>
  );
}

// UI Helpers
const StatBadge = ({ icon, label, value }) => (
  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
    <div style={{ background: 'rgba(15,23,42,0.8)', padding: '8px', borderRadius: '6px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>{value}</div>
    </div>
  </div>
);

const GlassCard = ({ title, children, style }) => (
  <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', padding: '20px', display: 'flex', flexDirection: 'column', ...style }}>
    {title && <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#E2E8F0', fontWeight: 600 }}>{title}</h2>}
    {children}
  </div>
);
