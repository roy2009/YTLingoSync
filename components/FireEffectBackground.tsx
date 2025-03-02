'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export default function FireEffectBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -100, y: -100, isActive: false });
  const frameIdRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const emittersRef = useRef<Array<{ x: number, y: number, strength: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initEmitters();
    };

    const initEmitters = () => {
      // 根据屏幕宽度创建多个火源
      const emitterCount = Math.max(3, Math.floor(canvas.width / 500));
      const emitters = [];

      // 均匀分布在底部
      for (let i = 0; i < emitterCount; i++) {
        emitters.push({
          x: canvas.width * (i + 0.5) / emitterCount,
          y: canvas.height,
          strength: 0.5 + Math.random() * 0.5 // 不同强度的火源
        });
      }

      emittersRef.current = emitters;
      particlesRef.current = [];
    };

    // 创建火焰粒子
    const createFireParticle = (x: number, y: number, initialVelocity = 0): Particle => {
      // 火焰颜色范围
      const colorPhase = Math.random();
      let color;

      if (colorPhase < 0.2) {
        // 深红色/橙色
        color = `rgb(${200 + Math.random() * 55}, ${100 + Math.random() * 50}, 50)`;
      } else if (colorPhase < 0.6) {
        // 黄色/橙色
        color = `rgb(${220 + Math.random() * 35}, ${150 + Math.random() * 80}, 50)`;
      } else {
        // 亮橙色/黄色
        color = `rgb(${230 + Math.random() * 25}, ${200 + Math.random() * 55}, ${50 + Math.random() * 50})`;
      }

      return {
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        size: 3 + Math.random() * 7,
        color,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2 - Math.random() * 2 - initialVelocity,
        life: 0,
        maxLife: 50 + Math.random() * 50
      };
    };

    // 渲染火焰效果
    const render = () => {
      if (!ctx || !canvas) return;

      // 清除画布 - 使用半透明黑色实现拖尾效果
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 更新时间
      timeRef.current += 0.01;

      // 从每个发射器创建粒子
      emittersRef.current.forEach(emitter => {
        // 发射器的脉冲效果
        const pulseStrength = emitter.strength * (1 + Math.sin(timeRef.current * 2 + emitter.x) * 0.2);
        
        // 每帧从每个发射器创建粒子
        const particleCount = Math.floor(5 * pulseStrength);
        for (let i = 0; i < particleCount; i++) {
          particlesRef.current.push(createFireParticle(emitter.x, emitter.y, pulseStrength * 2));
        }
      });

      // 鼠标交互 - 如果鼠标活跃，创建火焰粒子在鼠标位置
      if (mouseRef.current.isActive) {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push(createFireParticle(mouseRef.current.x, mouseRef.current.y, 3));
        }
      }

      // 更新和绘制粒子
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        // 更新位置
        p.x += p.vx;
        p.y += p.vy;
        
        // 添加上升效果
        p.vy -= 0.03; // 向上加速度
        p.vx *= 0.99; // 缓慢减小水平速度
        
        // 随机扰动
        p.vx += (Math.random() - 0.5) * 0.3;
        
        // 根据生命周期更新尺寸和透明度
        p.life++;
        
        if (p.life >= p.maxLife) {
          // 移除死亡粒子
          particlesRef.current.splice(i, 1);
          continue;
        }
        
        // 计算基于生命周期的尺寸和透明度
        const lifeRatio = p.life / p.maxLife;
        const size = p.size * (1 - lifeRatio * 0.8); // 随着生命减小
        const alpha = 1 - lifeRatio;
        
        // 绘制火焰粒子
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
        const baseColor = p.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        const fadeColor = p.color.replace('rgb', 'rgba').replace(')', ', 0)');
        
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, fadeColor);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 内部发光效果
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      }

      // 绘制底部熔岩流效果
      const lavaBandHeight = 30;
      const baseY = canvas.height - lavaBandHeight;
      
      // 创建熔岩流渐变
      const lavaGradient = ctx.createLinearGradient(0, baseY, 0, canvas.height);
      lavaGradient.addColorStop(0, 'rgba(255, 100, 50, 0.7)');
      lavaGradient.addColorStop(1, 'rgba(180, 30, 20, 0.9)');
      
      // 绘制起伏的熔岩带
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      for (let x = 0; x <= canvas.width; x += 20) {
        // 创建波浪效果
        const waveHeight = Math.sin(x * 0.03 + timeRef.current * 2) * 10 + 
                          Math.sin(x * 0.02 - timeRef.current * 3) * 5;
        
        ctx.lineTo(x, baseY + waveHeight);
      }
      
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fillStyle = lavaGradient;
      ctx.fill();
      
      // 熔岩流的发光效果
      ctx.shadowColor = 'rgba(255, 100, 20, 0.5)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      
      for (let x = 0; x <= canvas.width; x += 20) {
        const waveHeight = Math.sin(x * 0.03 + timeRef.current * 2) * 10 + 
                          Math.sin(x * 0.02 - timeRef.current * 3) * 5;
        
        ctx.lineTo(x, baseY + waveHeight);
      }
      
      ctx.lineTo(canvas.width, baseY);
      ctx.strokeStyle = 'rgba(255, 200, 50, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowBlur = 0;

      frameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { 
        x: e.clientX, 
        y: e.clientY,
        isActive: true
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
    };

    // 初始化
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    frameIdRef.current = requestAnimationFrame(render);

    // 清理
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', setCanvasSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
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
        background: 'linear-gradient(to bottom, #000000 0%, #1a0000 40%, #380000 100%)'
      }}
    />
  );
} 