'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  opacity: number;
  rotationSpeed: number;
  angle: number;
  baseSize: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  particles: Particle[];
  rotationSpeed: number;
  angle: number;
  glowIntensity: number;
}

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nebulasRef = useRef<Nebula[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const frameIdRef = useRef<number>(0);
  const hueRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticlesAndNebulas();
    };

    const getHslColor = (alpha: number) => {
      return `hsla(${hueRef.current % 360}, 70%, 50%, ${alpha})`;
    };

    const initParticlesAndNebulas = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3,
        color: `hsla(${Math.random() * 360}, 70%, 50%, ${Math.random() * 0.4 + 0.3})`,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        angle: Math.random() * Math.PI * 2,
        baseSize: Math.random() * 2 + 1
      }));

      nebulasRef.current = Array.from({ length: 3 }, (_, i) => {
        const radius = Math.min(canvas.width, canvas.height) * (0.15 + Math.random() * 0.1);
        return {
          x: canvas.width * (0.2 + Math.random() * 0.6),
          y: canvas.height * (0.2 + Math.random() * 0.6),
          radius,
          color: getHslColor(0.3),
          particles: Array.from({ length: 150 }, () => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * radius;
            return {
              x: 0,
              y: 0,
              size: Math.random() * 4 + 2,
              color: getHslColor(0.6),
              vx: Math.cos(angle) * 0.5,
              vy: Math.sin(angle) * 0.5,
              opacity: Math.random() * 0.7 + 0.3,
              rotationSpeed: (Math.random() - 0.5) * 0.02,
              angle,
              baseSize: Math.random() * 3 + 1
            };
          }),
          rotationSpeed: (Math.random() - 0.5) * 0.005,
          angle: Math.random() * Math.PI * 2,
          glowIntensity: 0
        };
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const render = () => {
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      // 动态背景渐变
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `hsla(${(hueRef.current + 180) % 360}, 80%, 10%, 0.2)`);
      gradient.addColorStop(1, `hsla(${hueRef.current % 360}, 80%, 20%, 0.2)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 更新全局色相
      hueRef.current += 0.3;

      // 绘制动态星空
      particlesRef.current.forEach(p => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        p.size = p.baseSize * (0.8 + Math.sin(Date.now() * 0.002) * 0.2);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
      });

      // 更新星云
      nebulasRef.current.forEach(nebula => {
        const centerX = nebula.x;
        const centerY = nebula.y;
        const mouseDist = Math.hypot(mouseRef.current.x - centerX, mouseRef.current.y - centerY);
        
        // 鼠标交互
        if (mouseDist < nebula.radius * 2 && mouseRef.current.active) {
          const angle = Math.atan2(centerY - mouseRef.current.y, centerX - mouseRef.current.x);
          const force = Math.min(2, 1000 / mouseDist);
          
          nebula.x += Math.cos(angle) * force;
          nebula.y += Math.sin(angle) * force;
          nebula.glowIntensity = Math.min(1, nebula.glowIntensity + 0.05);
        } else {
          nebula.glowIntensity = Math.max(0, nebula.glowIntensity - 0.01);
        }

        // 更新粒子
        nebula.particles.forEach(p => {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) + nebula.rotationSpeed;
          
          // 引力计算
          const targetX = centerX + Math.cos(angle) * nebula.radius * 0.8;
          const targetY = centerY + Math.sin(angle) * nebula.radius * 0.8;
          
          p.vx += (targetX - p.x) * 0.01;
          p.vy += (targetY - p.y) * 0.01;
          
          // 速度限制
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 5) {
            p.vx *= 0.95;
            p.vy *= 0.95;
          }

          p.x += p.vx;
          p.y += p.vy;
          
          // 粒子发光效果
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hueRef.current % 360}, 70%, 60%, ${p.opacity * 0.3})`;
          ctx.fill();
          
          // 粒子主体
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 20 * nebula.glowIntensity;
          ctx.fill();
        });

        // 星云光晕
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, nebula.radius * 2
        );
        gradient.addColorStop(0, `hsla(${hueRef.current % 360}, 80%, 60%, ${0.3 * nebula.glowIntensity})`);
        gradient.addColorStop(1, `hsla(${(hueRef.current + 60) % 360}, 80%, 30%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, nebula.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      mouseRef.current.active = false;
      frameIdRef.current = requestAnimationFrame(render);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('mousemove', handleMouseMove);
    frameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-background"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: -1,
        background: 'linear-gradient(45deg, #0a0a2e 0%, #1a1a4a 100%)'
      }}
    />
  );
}