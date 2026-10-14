import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sphere, Cylinder, Box } from '@react-three/drei';
import * as THREE from 'three';

// --- Mini Water Sprinkler (Mist Cannon) ---
const MAX_PARTICLES = 2500;
const DUMMY = new THREE.Object3D();

function MiniWaterSprinkler({ isRelayOn, intensity = 75 }) {
  const meshRef = useRef();

  // Active particle count scales with optimizer intensity
  const activeCount = Math.round(500 + (Math.max(20, Math.min(100, intensity)) / 100) * 2000);
  const speedMult = 0.5 + (intensity / 100) * 0.8;

  // Mist physics
  const particles = useMemo(() => {
    return Array.from({ length: MAX_PARTICLES }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      return {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius + 0.5,
          (Math.random() * 8 + 4) * speedMult
        ),
        life: Math.random() * 200,
      };
    });
  }, [speedMult]);

  useFrame(() => {
    if (!meshRef.current || !isRelayOn) return;
    for (let i = 0; i < activeCount; i++) {
      const p = particles[i];
      p.life -= 1;
      if (p.life <= 0) {
        p.position.set(0, 0, 0);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5;
        p.velocity.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius + 0.5,
          (Math.random() * 8 + 4) * speedMult
        );
        p.life = 200;
      }
      p.velocity.y -= 0.005;

      p.velocity.x *= 1.01;
      p.velocity.y *= 1.01;

      p.position.addScaledVector(p.velocity, 0.015);

      DUMMY.position.copy(p.position);
      const scale = 1 + (200 - p.life) / 40;
      DUMMY.scale.setScalar(scale);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Heavy Steel Base Plate */}
      <Box args={[1.4, 0.15, 1.4]} position={[0, 0.08, 0]}>
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </Box>

      {/* Support Arm */}
      <Box args={[0.3, 1.2, 0.3]} position={[0, 0.7, -0.2]}>
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </Box>

      {/* Mist Cannon Turbine */}
      <group position={[0, 1.4, 0]} rotation={[-0.2, 0, 0]}>
        {/* Outer casing */}
        <Cylinder args={[0.5, 0.4, 1.2, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.2} />
        </Cylinder>
        {/* Inner nozzle */}
        <Cylinder args={[0.45, 0.35, 1.21, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
        </Cylinder>

        {/* Status Indicator */}
        <Sphere args={[0.08, 16, 16]} position={[0, 0.55, 0]}>
          <meshBasicMaterial color={isRelayOn ? "#0284c7" : "#94a3b8"} />
        </Sphere>
        {isRelayOn && <pointLight position={[0, 0.7, 0]} color="#0284c7" intensity={2} distance={4} />}

        {/* Mist Cloud */}
        {isRelayOn && (
          <instancedMesh ref={meshRef} args={[null, null, MAX_PARTICLES]} position={[0, 0, 0.6]}>
            <sphereGeometry args={[0.09, 6, 6]} />
            <meshStandardMaterial color="#bae6fd" opacity={0.2} transparent depthWrite={false} roughness={0.9} />
          </instancedMesh>
        )}
      </group>
    </group>
  );
}

// --- Traffic Advisory Scene ---
function TrafficAdvisoryScene({ isRelayOn }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = -0.6 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]} rotation={[0, -Math.PI / 4, 0]}>
      {/* Road Base */}
      <Box args={[6, 0.1, 2.5]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </Box>
      {/* Road Markings */}
      <Box args={[5.8, 0.12, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </Box>

      {/* Building 1 */}
      <group position={[-1.5, 1.5, -1.8]}>
        <Box args={[0.9, 3, 0.9]}>
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.2} />
        </Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={`w1-${i}`} args={[0.1, 0.2, 0.95]} position={[0.4, -1 + i * 0.5, 0]}>
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
          </Box>
        ))}
      </group>

      {/* Building 2 */}
      <group position={[-0.2, 1.8, -1.5]}>
        <Box args={[0.8, 3.6, 0.8]}>
          <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.1} />
        </Box>
        <Box args={[0.9, 0.2, 0.9]} position={[0, 1.7, 0]}>
          <meshStandardMaterial color="#cbd5e1" />
        </Box>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={`w2-${i}`} args={[0.85, 0.1, 0.1]} position={[0, -1.2 + i * 0.4, 0.4]}>
            <meshStandardMaterial color="#94a3b8" />
          </Box>
        ))}
      </group>

      {/* Building 3 */}
      <group position={[1.2, 1, -1.2]}>
        <Cylinder args={[0.7, 0.7, 2, 32]}>
          <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.3} />
        </Cylinder>
        <Cylinder args={[0.72, 0.72, 0.05, 32]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.6} />
        </Cylinder>
      </group>

      {/* Yellow Car */}
      <group position={[-1.2, 0.2, 0.6]}>
        <Box args={[0.7, 0.2, 0.35]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#eab308" />
        </Box>
        <Box args={[0.4, 0.15, 0.3]} position={[-0.05, 0.15, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <Cylinder args={[0.08, 0.08, 0.4]} rotation={[Math.PI / 2, 0, 0]} position={[-0.2, -0.1, 0]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
        <Cylinder args={[0.08, 0.08, 0.4]} rotation={[Math.PI / 2, 0, 0]} position={[0.2, -0.1, 0]}>
          <meshStandardMaterial color="#0f172a" />
        </Cylinder>
      </group>

      {/* Truck */}
      <group position={[1.2, 0.35, -0.5]}>
        <Box args={[0.5, 0.4, 0.4]} position={[0.6, -0.05, 0]}>
          <meshStandardMaterial color="#f97316" />
        </Box>
        <Box args={[1.2, 0.6, 0.45]} position={[-0.25, 0.05, 0]}>
          <meshStandardMaterial color="#334155" />
        </Box>

        {/* Smoke Clouds */}
        <group position={[-1.2, 0.6, 0]}>
          <Sphere args={[0.25, 16, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#475569" roughness={1} />
          </Sphere>
          <Sphere args={[0.35, 16, 16]} position={[-0.3, 0.2, 0.1]}>
            <meshStandardMaterial color="#475569" roughness={1} />
          </Sphere>
        </group>
      </group>

      {/* Traffic Light */}
      <group position={[2.5, 0, 1.2]} rotation={[0, Math.PI / 4, 0]}>
        <Cylinder args={[0.04, 0.05, 2.5, 16]} position={[0, 1.25, 0]}>
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.2} />
        </Cylinder>
        <Box args={[0.3, 0.9, 0.3]} position={[-0.7, 2.1, 0]}>
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </Box>

        {/* Red Light */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 2.4, 0.18]}>
          <meshBasicMaterial color={isRelayOn ? "#dc2626" : "#450a0a"} />
        </Sphere>
        {isRelayOn && <pointLight position={[-0.7, 2.4, 0.3]} color="#dc2626" intensity={3} distance={5} />}

        {/* Yellow Light */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 2.1, 0.18]}>
          <meshBasicMaterial color={!isRelayOn ? "#d97706" : "#422006"} />
        </Sphere>
        {!isRelayOn && <pointLight position={[-0.7, 2.1, 0.3]} color="#d97706" intensity={1.5} distance={3} />}

        {/* Green Light */}
        <Sphere args={[0.09, 16, 16]} position={[-0.7, 1.8, 0.18]}>
          <meshBasicMaterial color="#065f46" />
        </Sphere>
      </group>
    </group>
  );
}

// --- Emergency Siren ---
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
        <meshStandardMaterial color="#475569" />
      </Cylinder>
      <group ref={groupRef} position={[0, 0.7, 0]}>
        <Cylinder args={[0.6, 0.6, 1, 32]} transparent opacity={0.6}>
          <meshPhysicalMaterial color={isRelayOn ? "#dc2626" : "#94a3b8"} transmission={0.5} roughness={0.2} />
        </Cylinder>
        <Box args={[0.2, 0.8, 0.2]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
        <pointLight ref={lightRef} color={isRelayOn ? "#dc2626" : "#000000"} distance={5} intensity={isRelayOn ? 1.5 : 0} />
      </group>
      <Cylinder args={[0.8, 0.8, 0.1, 32]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color="#475569" />
      </Cylinder>
    </group>
  );
}

// --- Magnifying Glass ---
function MagnifyingGlass() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.z = Math.sin(t * 1.5) * 0.4;
      groupRef.current.position.y = 0.4 + Math.sin(t * 2) * 0.05;
    }
  });

  return (
    <group position={[0, 0.4, 0]} ref={groupRef} scale={1.1}>
      {/* Outer Rim Main */}
      <mesh>
        <torusGeometry args={[0.9, 0.12, 64, 128]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Lens */}
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
        />
      </mesh>
      {/* Handle */}
      <group position={[0.9 * 0.707, 0.9 * -0.707, 0]} rotation={[0, 0, Math.PI / 4]}>
        <mesh position={[0, -0.9, 0]}>
          <cylinderGeometry args={[0.14, 0.19, 1.2, 32]} />
          <meshStandardMaterial color="#0284c7" metalness={0.3} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export default function ActionScene3D({ classifierLabel, isRelayOn, intensity = 75 }) {
  return (
    <div className="w-full h-full min-h-[360px] relative bg-slate-50">
      <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 15, 10]} intensity={1.3} />

        {/* Dynamic Scene */}
        {classifierLabel === 'construction_dust' && (
          <MiniWaterSprinkler isRelayOn={isRelayOn} intensity={intensity} />
        )}
        {classifierLabel === 'vehicle_combustion' && (
          <TrafficAdvisoryScene isRelayOn={isRelayOn} />
        )}
        {classifierLabel === 'waste_burning' && (
          <EmergencySiren isRelayOn={isRelayOn} />
        )}
        {(classifierLabel === 'humid_haze' || classifierLabel === 'clean' || !classifierLabel) && (
          <MagnifyingGlass />
        )}

        <Environment preset="city" />
        <OrbitControls
          enableZoom={true}
          minDistance={2.5}
          maxDistance={8}
          autoRotate={classifierLabel === 'construction_dust' || classifierLabel === 'waste_burning'}
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
}
