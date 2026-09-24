import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleCount = 2000;

function Particles() {
  const meshRef = useRef();

  // Initialize random attributes for each water droplet
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < ParticleCount; i++) {
      data.push({
        t: Math.random() * 2, // Start at different times
        factor: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.015 + 0.01,
        vx: (Math.random() - 0.5) * 4, // X Velocity
        vy: (Math.random() - 0.5) * 4, // Y Velocity
        vz: Math.random() * 4 + 4,     // Z Velocity (Upwards)
      });
    }
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const gravity = 8; // Downward acceleration

    particles.forEach((p, i) => {
      p.t += p.speed;
      
      let time = p.t;
      let pz = (p.vz * time) - (0.5 * gravity * time * time);

      // If particle hits the ground, recycle it
      if (pz < 0 && time > 0.1) {
        p.t = 0;
        time = 0;
        pz = 0;
      }
      
      // X and Y spread linearly with time
      const px = p.vx * time;
      const py = p.vy * time;

      dummy.position.set(px, py, pz);
      
      // Make particles shrink as they fall
      const scale = Math.max(0.01, 0.1 - (time * 0.04));
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, ParticleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshPhysicalMaterial 
        color="#aaddff" 
        transparent 
        opacity={0.7}
        roughness={0.1}
        transmission={0.9} 
        thickness={0.5} 
      />
    </instancedMesh>
  );
}

export default function WaterSprinkler3D() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '400px',
      height: '400px',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      {/* 
        Camera is positioned slightly below and looking up (along Y axis), 
        with Z as the "UP" vector to match map coordinate systems.
      */}
      <Canvas camera={{ position: [0, -15, 8], fov: 45, up: [0, 0, 1] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, 5]} intensity={0.5} color="#88ccff" />
        <Particles />
      </Canvas>
    </div>
  );
}
