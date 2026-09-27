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

// --- Traffic Advisory Scene (City + Traffic Light) ---
function TrafficAdvisoryScene({ isRelayOn }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating effect to mimic the isometric illustration feel
      groupRef.current.position.y = -0.6 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]} rotation={[0, -Math.PI / 4, 0]}>
      {/* Ground/Road Base */}
      <Box args={[6, 0.1, 2.5]} position={[0, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#312e81" roughness={0.8} />
      </Box>
      {/* Dashed Line */}
      <Box args={[5.8, 0.12, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </Box>

      {/* --- Building 1: Tall Purple Skyscraper --- */}
      <group position={[-1.5, 1.5, -1.8]}>
        <Box args={[0.9, 3, 0.9]}>
          <meshStandardMaterial color="#1e1b4b" roughness={0.3} metalness={0.2} />
        </Box>
        {/* Windows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={`w1-${i}`} args={[0.1, 0.2, 0.95]} position={[0.4, -1 + i * 0.5, 0]}>
            <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={0.8} />
          </Box>
        ))}
      </group>

      {/* --- Building 2: White Modern Tower --- */}
      <group position={[-0.2, 1.8, -1.5]}>
        <Box args={[0.8, 3.6, 0.8]}>
          <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.1} />
        </Box>
        <Box args={[0.9, 0.2, 0.9]} position={[0, 1.7, 0]}>
          <meshStandardMaterial color="#e2e8f0" />
        </Box>
        {/* Windows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={`w2-${i}`} args={[0.85, 0.1, 0.1]} position={[0, -1.2 + i * 0.4, 0.4]}>
            <meshStandardMaterial color="#94a3b8" />
          </Box>
        ))}
      </group>

      {/* --- Building 3: Tech Hub (Cylindrical) --- */}
      <group position={[1.2, 1, -1.2]}>
        <Cylinder args={[0.7, 0.7, 2, 32]}>
          <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.3} />
        </Cylinder>
        {/* Glowing Rings */}
        <Cylinder args={[0.72, 0.72, 0.05, 32]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} />
        </Cylinder>
        <Cylinder args={[0.72, 0.72, 0.05, 32]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} />
        </Cylinder>
        {/* Orange Roof */}
        <Cylinder args={[0.5, 0.5, 0.1, 32]} position={[0, 1.05, 0]}>
          <meshStandardMaterial color="#ea580c" />
        </Cylinder>
      </group>

      {/* --- Vehicles --- */}
      {/* Yellow Car */}
      <group position={[-1.2, 0.2, 0.6]}>
        <Box args={[0.7, 0.2, 0.35]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#eab308" />
        </Box>
        <Box args={[0.4, 0.15, 0.3]} position={[-0.05, 0.15, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        {/* Wheels */}
        <Cylinder args={[0.08, 0.08, 0.4]} rotation={[Math.PI/2, 0, 0]} position={[-0.2, -0.1, 0]}>
           <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.08, 0.08, 0.4]} rotation={[Math.PI/2, 0, 0]} position={[0.2, -0.1, 0]}>
           <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        {/* Headlights */}
        <Box args={[0.05, 0.05, 0.25]} position={[0.35, 0, 0]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
        </Box>
      </group>

      {/* Truck (Causing pollution) */}
      <group position={[1.2, 0.35, -0.5]}>
        {/* Cabin */}
        <Box args={[0.5, 0.4, 0.4]} position={[0.6, -0.05, 0]}>
          <meshStandardMaterial color="#f97316" />
        </Box>
        <Box args={[0.2, 0.2, 0.38]} position={[0.6, 0.1, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        {/* Cargo */}
        <Box args={[1.2, 0.6, 0.45]} position={[-0.25, 0.05, 0]}>
          <meshStandardMaterial color="#1e1b4b" />
        </Box>
        {/* Wheels */}
        <Cylinder args={[0.1, 0.1, 0.5]} rotation={[Math.PI/2, 0, 0]} position={[0.6, -0.2, 0]}>
           <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 0.5]} rotation={[Math.PI/2, 0, 0]} position={[-0.4, -0.2, 0]}>
           <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 0.5]} rotation={[Math.PI/2, 0, 0]} position={[-0.7, -0.2, 0]}>
           <meshStandardMaterial color="#0f172a" />
        </Cylinder>

        {/* Smoke Clouds from Truck */}
        <group position={[-1.2, 0.6, 0]}>
          <Sphere args={[0.25, 16, 16]} position={[0, 0, 0]}>
             <meshStandardMaterial color="#0f172a" roughness={1} />
          </Sphere>
          <Sphere args={[0.35, 16, 16]} position={[-0.3, 0.2, 0.1]}>
             <meshStandardMaterial color="#0f172a" roughness={1} />
          </Sphere>
          <Sphere args={[0.2, 16, 16]} position={[-0.5, 0.1, -0.1]}>
             <meshStandardMaterial color="#0f172a" roughness={1} />
          </Sphere>
          <Sphere args={[0.4, 16, 16]} position={[-0.6, 0.4, 0.2]}>
             <meshStandardMaterial color="#0f172a" roughness={1} />
          </Sphere>
        </group>
      </group>

      {/* --- Detailed Traffic Light --- */}
      <group position={[2.5, 0, 1.2]} rotation={[0, Math.PI / 4, 0]}>
        {/* Base */}
        <Cylinder args={[0.2, 0.2, 0.1, 16]} position={[0, 0.05, 0]}>
          <meshStandardMaterial color="#334155" />
        </Cylinder>
        {/* Pole */}
        <Cylinder args={[0.04, 0.05, 2.5, 16]} position={[0, 1.25, 0]}>
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.2} />
        </Cylinder>
        {/* Arm */}
        <Cylinder args={[0.03, 0.03, 0.8, 16]} rotation={[0, 0, Math.PI/2]} position={[-0.4, 2.4, 0]}>
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.2} />
        </Cylinder>
        
        {/* Light Housing */}
        <Box args={[0.3, 0.9, 0.3]} position={[-0.7, 2.1, 0]}>
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </Box>
        {/* Hoods */}
        <Cylinder args={[0.12, 0.12, 0.1, 16]} rotation={[Math.PI/2, 0, 0]} position={[-0.7, 2.4, 0.16]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.12, 0.12, 0.1, 16]} rotation={[Math.PI/2, 0, 0]} position={[-0.7, 2.1, 0.16]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.12, 0.12, 0.1, 16]} rotation={[Math.PI/2, 0, 0]} position={[-0.7, 1.8, 0.16]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>

        {/* Lights */}
        {/* Red Light (Active when Relay ON) */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 2.4, 0.18]}>
          <meshBasicMaterial color={isRelayOn ? "#ef4444" : "#450a0a"} />
        </Sphere>
        {isRelayOn && <pointLight position={[-0.7, 2.4, 0.3]} color="#ef4444" intensity={3} distance={5} />}
        
        {/* Yellow Light */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 2.1, 0.18]}>
          <meshBasicMaterial color={!isRelayOn ? "#eab308" : "#422006"} />
        </Sphere>
        {!isRelayOn && <pointLight position={[-0.7, 2.1, 0.3]} color="#eab308" intensity={1.5} distance={3} />}

        {/* Green Light */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 1.8, 0.18]}>
          <meshBasicMaterial color="#064e3b" />
        </Sphere>
      </group>
    </group>
  );
}

// --- Emergency Siren (Waste Burning) ---
function EmergencySiren({ isRelayOn }) {
  const lightRef = useRef();
  const groupRef = useRef();

  useFrame((state) => {
    if (isRelayOn) {
      if (lightRef.current) {
        lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 10) * 2;
      }
      if (groupRef.current) {
        groupRef.current.rotation.y += 0.1;
      }
    } else {
      if (lightRef.current) lightRef.current.intensity = 0;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      <Cylinder args={[0.8, 0.8, 0.3, 32]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
      <group ref={groupRef} position={[0, 0.7, 0]}>
        <Cylinder args={[0.6, 0.6, 1, 32]} transparent opacity={0.6}>
          <meshPhysicalMaterial color={isRelayOn ? "#ef4444" : "#94a3b8"} transmission={0.5} roughness={0.2} />
        </Cylinder>
        <Box args={[0.2, 0.8, 0.2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <pointLight ref={lightRef} color={isRelayOn ? "#ef4444" : "#000000"} distance={5} intensity={isRelayOn ? 1 : 0} />
      </group>
      <Cylinder args={[0.8, 0.8, 0.1, 32]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
    </group>
  );
}

// --- Magnifying Glass (Monitoring / No Action) ---
function MagnifyingGlass() {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // Light zoom in and zoom out (Z-axis) to represent careful monitoring
      groupRef.current.position.z = Math.sin(t * 1.5) * 0.5;
      // Very subtle up/down hover to keep it organic
      groupRef.current.position.y = 0.4 + Math.sin(t * 2) * 0.05;
      
      // Ensure it stays perfectly facing forward for the best reflection/view
      groupRef.current.rotation.y = 0;
      groupRef.current.rotation.z = 0;
    }
  });

  return (
    <group position={[0, 0.4, 0]} ref={groupRef} scale={1.1} rotation={[0, 0, 0]}>
      
      {/* Outer Rim Main (Polished Chrome) */}
      <mesh>
        <torusGeometry args={[0.9, 0.12, 64, 128]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} envMapIntensity={2} />
      </mesh>
      
      {/* Inner Rim Base (Matte metal holding the glass) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.15, 128]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Chrome Inner Ridge (Front) */}
      <mesh position={[0, 0, 0.08]}>
        <torusGeometry args={[0.85, 0.04, 32, 128]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} envMapIntensity={2} />
      </mesh>

      {/* Chrome Inner Ridge (Back) */}
      <mesh position={[0, 0, -0.08]}>
        <torusGeometry args={[0.85, 0.04, 32, 128]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} envMapIntensity={2} />
      </mesh>
      
      {/* Lens (Thick Convex Physical Glass) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.18, 1]}>
        <sphereGeometry args={[0.84, 64, 64]} />
        <meshPhysicalMaterial 
          color="#bae6fd" 
          transmission={0.95} 
          opacity={1} 
          transparent 
          roughness={0} 
          metalness={0.1}
          ior={1.4} 
          thickness={1.5}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2.5}
        />
      </mesh>
      
      {/* --- Handle Group --- */}
      <group position={[0.9 * 0.707, 0.9 * -0.707, 0]} rotation={[0, 0, Math.PI / 4]}>
        
        {/* Base Connector to Rim (Chrome) */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.3, 32]} />
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.1} envMapIntensity={1.5} />
        </mesh>

        {/* Silver Ring at top of handle */}
        <mesh position={[0, -0.3, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.14, 0.03, 32, 64]} />
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} envMapIntensity={2} />
        </mesh>

        {/* Main Handle Body (Dark glossy blue) */}
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.14, 0.19, 1.2, 32]} />
          <meshStandardMaterial 
            color="#1e3a8a" 
            metalness={0.3} 
            roughness={0.2} 
            clearcoat={1} 
            clearcoatRoughness={0.1} 
            envMapIntensity={1}
          />
        </mesh>
        
        {/* Silver Ring at bottom of handle */}
        <mesh position={[0, -1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.19, 0.03, 32, 64]} />
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} envMapIntensity={2} />
        </mesh>

        {/* End Cap (Chrome dome) */}
        <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI]}>
          <sphereGeometry args={[0.19, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.1} envMapIntensity={1.5} />
        </mesh>
        
      </group>
    </group>
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
        {classifierLabel === 'vehicle_combustion' && <TrafficAdvisoryScene isRelayOn={isRelayOn} />}
        {classifierLabel === 'waste_burning' && <EmergencySiren isRelayOn={isRelayOn} />}
        {(classifierLabel === 'humid_haze' || classifierLabel === 'clean' || !classifierLabel) && <MagnifyingGlass />}
        
        <Environment preset="city" />
        <OrbitControls enableZoom={true} minDistance={3} maxDistance={10} autoRotate={classifierLabel === 'construction_dust' || classifierLabel === 'waste_burning'} autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}
