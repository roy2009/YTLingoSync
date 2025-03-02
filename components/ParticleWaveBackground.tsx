'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export default function ParticleWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, radius: 150 });
  const frameIdRef = useRef<number>(0);
  const hueRef = useRef(220); // 蓝色色调开始

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 8000);
      const particles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 2,
          color: `hsla(${hueRef.current + Math.random() * 30}, 80%, 60%, ${Math.random() * 0.6 + 0.2})`,
          speedX: Math.random() * 0.5 - 0.25,
          speedY: Math.random() * 0.5 - 0.25,
          amplitude: Math.random() * 20 + 5,
          frequency: Math.random() * 0.02 + 0.01,
          phase: Math.random() * Math.PI * 2
        });
      }

      particlesRef.current = particles;
    };

    const render = () => {
      if (!ctx || !canvas) return;

      // 半透明背景，形成拖尾效果
      ctx.fillStyle = 'rgba(5, 5, 20, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 缓慢改变色相
      hueRef.current = (hueRef.current + 0.1) % 360;

      particlesRef.current.forEach(particle => {
        // 波动运动
        const time = Date.now() * 0.001;
        const waveX = Math.sin(time * particle.frequency + particle.phase) * particle.amplitude;
        const waveY = Math.cos(time * particle.frequency + particle.phase) * particle.amplitude;

        // 更新位置
        particle.x += particle.speedX + waveX * 0.05;
        particle.y += particle.speedY + waveY * 0.05;

        // 边界检查
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // 计算与鼠标的距离
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 鼠标交互效果
        if (distance < mouseRef.current.radius) {
          const angle = Math.atan2(dy, dx);
          const force = (mouseRef.current.radius - distance) / mouseRef.current.radius;
          particle.x -= Math.cos(angle) * force * 5;
          particle.y -= Math.sin(angle) * force * 5;
          particle.size += force * 0.5;
        } else {
          // 粒子大小呼吸效果
          particle.size = Math.max(
            2, 
            particle.size * 0.98 + Math.sin(time * 2 + particle.phase) * 0.5
          );
        }

        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/hsla\([\d.]+/, `hsla(${hueRef.current + Math.sin(time + particle.x * 0.01) * 20}`);
        ctx.fill();

        // 绘制连接线
        particlesRef.current.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 80) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${120 + Math.sin(time) * 50}, ${180 + Math.cos(time) * 30}, 255, ${0.2 * (1 - distance / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      frameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    // 初始化
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        background: 'linear-gradient(45deg, #040428 0%, #0A0A2A 100%)'
      }}
    />
  );
} 