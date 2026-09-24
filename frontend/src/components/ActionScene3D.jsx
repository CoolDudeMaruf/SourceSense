import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, Cylinder, Cone, Box } from '@react-three/drei';
import * as THREE from 'three';

// --- Mini Water Sprinkler (Mist Cannon) ---
const PARTICLE_COUNT = 2500; // Massive amount of particles for thick mist cloud
const DUMMY = new THREE.Object3D();

function MiniWaterSprinkler({ isRelayOn }) {
  const meshRef = useRef();
  
  // Mist physics (spraying forward in a massive expanding cone)
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      return {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * radius, 
          Math.sin(angle) * radius + 0.5, 
          Math.random() * 8 + 4 // Shoot VERY far forward along Z
        ),
        life: Math.random() * 200, // Live much longer to fill the air
      };
    });
  }, []);

  useFrame(() => {
    if (!meshRef.current || !isRelayOn) return;
    particles.forEach((p, i) => {
      p.life -= 1;
      if (p.life <= 0) {
        p.position.set(0, 0, 0);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5; // Wide spray
        p.velocity.set(
          Math.cos(angle) * radius, 
          Math.sin(angle) * radius + 0.5, 
          Math.random() * 8 + 4
        );
        p.life = 200;
      }
      p.velocity.y -= 0.005; // Almost zero gravity so it floats like real mist
      
      // Expand the cone as it travels outward (X/Y spread increases naturally)
      p.velocity.x *= 1.01;
      p.velocity.y *= 1.01;
      
      p.position.addScaledVector(p.velocity, 0.015); 
      
      DUMMY.position.copy(p.position);
      // Scale up hugely as it dissipates into a cloud
      const scale = 1 + (200 - p.life) / 40;
      DUMMY.scale.setScalar(scale);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Sleek Industrial Base */}
      <Box args={[1.2, 0.2, 1.2]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </Box>
      
      {/* Support Arm */}
      <Box args={[0.3, 1.2, 0.3]} position={[0, 0.7, -0.2]}>
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </Box>
      
      {/* Mist Cannon Turbine (Rotated slightly upwards) */}
      <group position={[0, 1.4, 0]} rotation={[-0.2, 0, 0]}>
        {/* Outer silver casing */}
        <Cylinder args={[0.5, 0.4, 1.2, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </Cylinder>
        {/* Inner dark barrel to give depth */}
        <Cylinder args={[0.45, 0.35, 1.21, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        
        {/* Glowing Status Indicator */}
        <Sphere args={[0.08, 16, 16]} position={[0, 0.55, 0]}>
          <meshBasicMaterial color={isRelayOn ? "#38bdf8" : "#94a3b8"} />
        </Sphere>
        {isRelayOn && <pointLight position={[0, 0.7, 0]} color="#38bdf8" intensity={1} distance={3} />}
        
        {/* Smoke-like Mist Particles emitting from the front of the barrel */}
        {isRelayOn && (
          <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]} position={[0, 0, 0.6]}>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color="#ffffff" opacity={0.08} transparent depthWrite={false} roughness={1} />
          </instancedMesh>
        )}
      </group>
    </group>
  );
}

// --- Traffic Cone (Vehicle Combustion) ---
function TrafficCone() {
  const coneRef = useRef();
  
  useFrame((state) => {
    if (coneRef.current) {
      coneRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={coneRef} position={[0, -0.5, 0]}>
      {/* Base */}
      <Box args={[1.5, 0.1, 1.5]} position={[0, 0.05, 0]}>
        <meshStandardMaterial color="#f97316" />
      </Box>
      {/* Cone Body */}
      <Cone args={[0.5, 2, 16]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color="#f97316" />
      </Cone>
      {/* White Stripes */}
      <Cylinder args={[0.35, 0.43, 0.4, 16]} position={[0, 1.2, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Cylinder>
      <Cylinder args={[0.2, 0.28, 0.3, 16]} position={[0, 1.8, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Cylinder>
      {/* Flashing Light */}
      <Float speed={5} rotationIntensity={0} floatIntensity={1}>
        <Sphere args={[0.2, 16, 16]} position={[0, 2.4, 0]}>
          <meshBasicMaterial color="#fbbf24" />
        </Sphere>
        <pointLight position={[0, 2.4, 0]} color="#fbbf24" intensity={2} distance={5} />
      </Float>
    </group>
  );
}

// --- Emergency Siren (Waste Burning) ---
function EmergencySiren() {
  const lightRef = useRef();
  const groupRef = useRef();

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 10) * 2;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.1;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      <Cylinder args={[0.8, 0.8, 0.3, 32]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
      <group ref={groupRef} position={[0, 0.7, 0]}>
        <Cylinder args={[0.6, 0.6, 1, 32]} transparent opacity={0.6}>
          <meshPhysicalMaterial color="#ef4444" transmission={0.5} roughness={0.2} />
        </Cylinder>
        <Box args={[0.2, 0.8, 0.2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <pointLight ref={lightRef} color="#ef4444" distance={5} />
      </group>
      <Cylinder args={[0.8, 0.8, 0.1, 32]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
    </group>
  );
}

// --- Shield / Orb (Monitoring) ---
function MonitoringShield() {
  const orbRef = useRef();
  
  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += 0.01;
      orbRef.current.rotation.x += 0.005;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      orbRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={orbRef} args={[1, 32, 32]}>
        <meshPhysicalMaterial 
          color="#4ade80" 
          transmission={0.9} 
          opacity={1} 
          transparent 
          roughness={0} 
          thickness={1}
          envMapIntensity={2}
        />
      </Sphere>
      <pointLight color="#4ade80" intensity={1} distance={4} />
    </Float>
  );
}

export default function ActionScene3D({ classifierLabel, isRelayOn }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative' }}>
      <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        
        {/* Render appropriate scene based on classification */}
        {classifierLabel === 'construction_dust' && <MiniWaterSprinkler isRelayOn={isRelayOn} />}
        {classifierLabel === 'vehicle_combustion' && <TrafficCone />}
        {classifierLabel === 'waste_burning' && <EmergencySiren />}
        {(classifierLabel === 'humid_haze' || classifierLabel === 'clean' || !classifierLabel) && <MonitoringShield />}
        
        <Environment preset="city" />
        <OrbitControls enableZoom={true} minDistance={3} maxDistance={10} autoRotate={classifierLabel !== 'vehicle_combustion'} autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}
