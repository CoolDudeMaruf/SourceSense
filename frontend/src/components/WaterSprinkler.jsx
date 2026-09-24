import React, { useEffect, useRef } from 'react';

export default function WaterSprinkler() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width;
    let height = canvas.height;
    
    let particles = [];
    let animationFrameId;

    const createParticle = (initial = false) => {
      const angle = Math.random() * Math.PI * 2;
      // Random speed outwards
      const speed = Math.random() * 2 + 0.5;
      
      // If initial, randomize life to avoid clumps
      const life = initial ? Math.random() : 1.0;
      
      return {
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: (Math.sin(angle) * speed) - (Math.random() * 3 + 2), // Strong upward bias
        life: life,
        decay: Math.random() * 0.01 + 0.01,
        size: Math.random() * 1.5 + 1
      };
    };

    // Pre-fill particles
    for (let i = 0; i < 80; i++) {
      particles.push(createParticle(true));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Add new particles constantly
      for (let i = 0; i < 5; i++) {
        particles.push(createParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity (pulls droplets down)
        
        // Add a slight wind or horizontal drag
        p.vx *= 0.98;
        
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Color shifts from bright white/blue to transparent
        const alpha = Math.max(0, p.life);
        ctx.fillStyle = `rgba(180, 230, 255, ${alpha * 0.8})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={250} 
      height={250} 
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 5
      }}
    />
  );
}
