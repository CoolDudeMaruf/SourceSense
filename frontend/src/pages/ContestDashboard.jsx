import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Box, Sphere, Points, PointMaterial } from '@react-three/drei';
import { Activity, ShieldCheck, Cpu, Droplets, Wind, AlertTriangle, Play, Pause, Settings, X, Power, Signal, Server } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import * as THREE from 'three';

// --- Part 1 & 4: UI Styling Tokens & Layout ---
const theme = {
  bg: '#0B0F19',
  cardBg: 'rgba(17, 24, 39, 0.65)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F3F4F6',
  textMuted: '#9CA3AF',
  neonCyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  crimson: '#EF4444',
  glass: {
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.05)'
  }
};

// Mock data generator for charts
const generateTimeseries = (count = 20) => Array.from({ length: count }, (_, i) => ({
  time: `+${i}s`,
  pm25: 10 + Math.random() * 40,
  pm10: 20 + Math.random() * 50,
  temp: 24 + Math.random() * 5,
  hum: 50 + Math.random() * 20,
}));

// --- Part 3: 3D Digital Twin ---
const ParticleSystem = ({ active, fault }) => {
  const pointsRef = useRef();
  const particleCount = 500;
  
  const [positions] = useState(() => {
    const pos = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) {
      pos[i] = (Math.random() - 0.5) * 5;
    }
    return pos;
  });

  useFrame((state) => {
    if (active && pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });

  if (!active && !fault) return null;

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={fault ? theme.crimson : theme.neonCyan}
        size={0.1}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
};

const NodeModel = ({ state }) => {
  const isFault = state === 'FAULT';
  const isActive = state === 'ACTIVE';
  
  return (
    <group>
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[1, 1, 0.5, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 2, 1.5]} />
        <meshStandardMaterial 
          color={isFault ? theme.crimson : (isActive ? theme.neonCyan : "#475569")} 
          wireframe={isFault}
          emissive={isFault ? theme.crimson : (isActive ? theme.neonCyan : "#000")}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <ParticleSystem active={isActive} fault={isFault} />
    </group>
  );
};

export default function ContestDashboard() {
  const [nodes, setNodes] = useState([
    { id: 'ND-001', lat: 45, lng: -75, state: 'NORMAL', pm25: 12, pm10: 25, massExtracted: 1.25, uptime: '99.9%' },
    { id: 'ND-002', lat: 46, lng: -74, state: 'ACTIVE', pm25: 65, pm10: 110, massExtracted: 3.42, uptime: '99.9%' },
    { id: 'ND-003', lat: 44, lng: -76, state: 'PENDING_ACTION', pm25: 45, pm10: 80, massExtracted: 0.85, uptime: '99.8%' },
    { id: 'ND-004', lat: 45.5, lng: -74.5, state: 'FAULT', pm25: 0, pm10: 0, massExtracted: 0, uptime: '85.2%' },
  ]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [mockValue, setMockValue] = useState(50);
  const [metrics, setMetrics] = useState(generateTimeseries());

  // Simulation loop for mock data
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => [...prev.slice(1), {
        time: 'Now',
        pm25: overrideMode ? mockValue : 10 + Math.random() * 40,
        pm10: (overrideMode ? mockValue : 20 + Math.random() * 50) * 1.5,
        temp: 24 + Math.random() * 5,
        hum: 50 + Math.random() * 20,
      }]);
    }, 2000);
    return () => clearInterval(timer);
  }, [overrideMode, mockValue]);

  // Derived global metrics
  const totalMass = nodes.reduce((acc, n) => acc + n.massExtracted, 0).toFixed(2);
  const healthIndex = (nodes.filter(n => n.state !== 'FAULT').length / nodes.length * 100).toFixed(1);

  const getNodeColor = (state) => {
    switch(state) {
      case 'NORMAL': return theme.emerald;
      case 'ACTIVE': return theme.neonCyan;
      case 'PENDING_ACTION': return theme.amber;
      case 'FAULT': return theme.crimson;
      default: return theme.textMuted;
    }
  };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.textPrimary, minHeight: '100vh', fontFamily: "'Inter', sans-serif", padding: 24 }}>
      {/* Executive Telemetry Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'System Uptime', value: '99.98%', icon: <Power size={18}/>, color: theme.emerald },
          { label: 'Active Nodes', value: `${nodes.filter(n => n.state !== 'FAULT').length}/${nodes.length}`, icon: <Server size={18}/>, color: theme.neonCyan },
          { label: 'Mass Extracted', value: `${totalMass} g`, icon: <Droplets size={18}/>, color: theme.amber },
          { label: 'Network throughput', value: '1.2 GB/s', icon: <Signal size={18}/>, color: theme.textPrimary },
          { label: 'Health Index', value: `${healthIndex}/100`, icon: <ShieldCheck size={18}/>, color: healthIndex > 90 ? theme.emerald : theme.crimson },
        ].map((stat, i) => (
          <div key={i} style={{ ...theme.glass, padding: '20px 24px', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textMuted, fontSize: '0.85rem', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {stat.label} {React.cloneElement(stat.icon, { color: stat.color })}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Macro View (Spatial Map Placeholder) */}
        <div style={{ ...theme.glass, borderRadius: 16, padding: 24, minHeight: 500, position: 'relative' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color={theme.neonCyan} /> Spatial Node Map
          </h2>
          <div style={{ width: '100%', height: 'calc(100% - 40px)', background: '#0F172A', borderRadius: 12, position: 'relative', border: theme.border, overflow: 'hidden' }}>
            {/* Grid background pattern */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.3 }} />
            
            {/* Mock Nodes */}
            {nodes.map((node, i) => {
              const x = 20 + (i * 25);
              const y = 30 + (i % 2 === 0 ? 20 : -10);
              const isSelected = selectedNode?.id === node.id;
              const color = getNodeColor(node.state);
              
              return (
                <div 
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    position: 'absolute', left: `${x}%`, top: `${y}%`,
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: color,
                    boxShadow: `0 0 20px ${color}`, border: `2px solid ${theme.bg}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {node.state === 'FAULT' && <div style={{width: 8, height: 8, backgroundColor: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite'}} />}
                  </div>
                  <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', background: theme.cardBg, padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, color: '#fff', border: theme.border, whiteSpace: 'nowrap' }}>
                    {node.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Split Telemetry Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ ...theme.glass, borderRadius: 16, padding: 24, flex: 1 }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wind size={20} color={theme.emerald} /> Real-Time PM2.5 / PM10
            </h2>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.neonCyan} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.neonCyan} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPm10" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.amber} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.amber} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke={theme.textMuted} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={theme.textMuted} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: theme.cardBg, borderColor: theme.border, borderRadius: 8, color: '#fff' }} />
                  <Area type="monotone" dataKey="pm25" stroke={theme.neonCyan} fillOpacity={1} fill="url(#colorPm25)" strokeWidth={2} />
                  <Area type="monotone" dataKey="pm10" stroke={theme.amber} fillOpacity={1} fill="url(#colorPm10)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ ...theme.glass, borderRadius: 16, padding: 24, flex: 1 }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={20} color={theme.textMuted} /> Judge Override & Fault Injection
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 8 }}>
              <button 
                onClick={() => setOverrideMode(!overrideMode)}
                style={{ 
                  background: overrideMode ? theme.crimson : theme.cardBg, 
                  color: '#fff', border: theme.border, padding: '8px 16px', borderRadius: 8, 
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {overrideMode ? 'Disable Override' : 'Enable Override'}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: theme.textMuted, marginBottom: 8 }}>
                  <span>Mock Particulate Level</span>
                  <span style={{ color: theme.neonCyan, fontWeight: 700 }}>{mockValue} µg/m³</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="500" 
                  value={mockValue} 
                  onChange={(e) => setMockValue(Number(e.target.value))}
                  disabled={!overrideMode}
                  style={{ width: '100%', opacity: overrideMode ? 1 : 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: selectedNode ? 0 : '-500px', width: 450, height: '100vh',
        background: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100, padding: 32, display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
      }}>
        {selectedNode && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>{selectedNode.id}</h2>
                <div style={{ color: getNodeColor(selectedNode.state), fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: getNodeColor(selectedNode.state) }} />
                  {selectedNode.state}
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* 3D Digital Twin Canvas */}
            <div style={{ width: '100%', height: 250, background: '#000', borderRadius: 12, overflow: 'hidden', border: theme.border, marginBottom: 24, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: theme.textMuted, border: theme.border }}>
                Digital Twin Sync
              </div>
              <Canvas camera={{ position: [3, 3, 3], fov: 45 }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <NodeModel state={selectedNode.state} />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
                <Environment preset="city" />
              </Canvas>
            </div>

            {/* Raw JSON Packet Logs */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Raw Telemetry Payload</h3>
              <pre style={{ 
                background: '#0F172A', padding: 16, borderRadius: 8, border: theme.border, fontSize: '0.75rem', 
                color: theme.neonCyan, overflowX: 'auto', margin: 0, fontFamily: 'monospace'
              }}>
                {JSON.stringify({
                  timestamp: new Date().toISOString(),
                  node_id: selectedNode.id,
                  sensors: {
                    pm25: selectedNode.pm25,
                    pm10: selectedNode.pm10,
                    snr: "24.5dB"
                  },
                  actuator: {
                    duty_cycle: selectedNode.state === 'ACTIVE' ? '100%' : '0%',
                    safety_interlock: selectedNode.state === 'FAULT' ? 'ENGAGED' : 'STANDBY'
                  },
                  efficiency_curve: {
                    extraction_rate: `${(selectedNode.massExtracted / 24).toFixed(3)}g/hr`
                  }
                }, null, 2)}
              </pre>

              {selectedNode.state === 'FAULT' && (
                <div style={{ marginTop: 16, background: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${theme.crimson}`, padding: 16, borderRadius: 8 }}>
                  <h4 style={{ color: theme.crimson, fontSize: '0.85rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={16} /> FAULT DETECTED
                  </h4>
                  <p style={{ color: '#FCA5A5', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    Safety Interlock engaged. Live actuation triggers disabled. 
                    <br/><br/>
                    <strong>Suggested Remedy:</strong> Inspect sensor wire harness on sub-assembly B. Reboot sequence required after physical intervention.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
