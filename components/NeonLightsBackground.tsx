'use client';

import { useEffect, useRef } from 'react';

interface NeonLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  color: string;
  speed: number;
  angle: number;
  length: number;
  glowSize: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface NeonShape {
  x: number;
  y: number;
  size: number;
  sides: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export default function NeonLightsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<NeonLine[]>([]);
  const shapesRef = useRef<NeonShape[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const frameIdRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNeonElements();
    };

    // 创建霓虹颜色
    const getNeonColor = (baseHue: number) => {
      const hue = (baseHue + Math.random() * 60) % 360;
      return `hsl(${hue}, 100%, 60%)`;
    };

    // 初始化霓虹元素
    const initNeonElements = () => {
      // 创建霓虹线
      const lineCount = Math.floor(canvas.width / 200);
      const lines: NeonLine[] = [];

      for (let i = 0; i < lineCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const length = 50 + Math.random() * 150;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        lines.push({
          startX: x,
          startY: y,
          endX: x + Math.cos(angle) * length,
          endY: y + Math.sin(angle) * length,
          width: 1 + Math.random() * 2,
          color: getNeonColor(i * 30),
          speed: 0.2 + Math.random() * 0.8,
          angle,
          length,
          glowSize: 5 + Math.random() * 10,
          pulseSpeed: 0.02 + Math.random() * 0.04,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
      linesRef.current = lines;

      // 创建霓虹形状
      const shapeCount = Math.floor(canvas.width / 300);
      const shapes: NeonShape[] = [];

      for (let i = 0; i < shapeCount; i++) {
        shapes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 20 + Math.random() * 40,
          sides: Math.floor(Math.random() * 3) + 3, // 三角形到五边形
          color: getNeonColor(i * 60 + 120),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          pulseSpeed: 0.03 + Math.random() * 0.05,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
      shapesRef.current = shapes;
    };

    // 绘制霓虹多边形
    const drawNeonPolygon = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      size: number, 
      sides: number, 
      rotation: number, 
      color: string, 
      glowIntensity: number
    ) => {
      ctx.save();
      
      // 绘制外发光
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * glowIntensity;
      
      ctx.beginPath();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      
      const angleStep = (Math.PI * 2) / sides;
      
      for (let i = 0; i < sides; i++) {
        const angle = i * angleStep;
        const pointX = Math.cos(angle) * size;
        const pointY = Math.sin(angle) * size;
        
        if (i === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 填充半透明颜色
      ctx.fillStyle = color.replace('hsl', 'hsla').replace(')', ', 0.1)');
      ctx.fill();
      
      ctx.restore();
    };

    // 绘制霓虹线
    const drawNeonLine = (
      ctx: CanvasRenderingContext2D, 
      startX: number, 
      startY: number, 
      endX: number, 
      endY: number, 
      width: number, 
      color: string, 
      glowSize: number,
      glowIntensity: number
    ) => {
      ctx.save();
      
      // 外发光效果
      ctx.shadowColor = color;
      ctx.shadowBlur = glowSize * glowIntensity;
      
      // 绘制线条
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      ctx.restore();
    };

    const render = () => {
      if (!ctx || !canvas) return;
      
      // 清除画布，使用半透明黑色形成拖尾效果
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      timeRef.current += 0.01;
      
      // 更新和绘制霓虹线
      linesRef.current.forEach(line => {
        // 脉冲效果
        const pulseValue = 0.7 + Math.sin(timeRef.current * line.pulseSpeed + line.pulsePhase) * 0.3;
        
        // 更新位置
        const centerX = (line.startX + line.endX) / 2;
        const centerY = (line.startY + line.endY) / 2;
        
        line.angle += line.speed * 0.005;
        line.startX = centerX + Math.cos(line.angle) * line.length / 2;
        line.startY = centerY + Math.sin(line.angle) * line.length / 2;
        line.endX = centerX - Math.cos(line.angle) * line.length / 2;
        line.endY = centerY - Math.sin(line.angle) * line.length / 2;
        
        // 边界检查，重置位置
        if (
          line.startX < -100 || line.startX > canvas.width + 100 ||
          line.startY < -100 || line.startY > canvas.height + 100
        ) {
          line.startX = Math.random() * canvas.width;
          line.startY = Math.random() * canvas.height;
          line.angle = Math.random() * Math.PI * 2;
          line.endX = line.startX + Math.cos(line.angle) * line.length;
          line.endY = line.startY + Math.sin(line.angle) * line.length;
        }
        
        // 鼠标交互
        const dx = mouseRef.current.x - centerX;
        const dy = mouseRef.current.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200 && mouseRef.current.active) {
          const angle = Math.atan2(dy, dx);
          const force = (200 - distance) / 200;
          line.startX += Math.cos(angle) * force * 2;
          line.startY += Math.sin(angle) * force * 2;
          line.endX += Math.cos(angle) * force * 2;
          line.endY += Math.sin(angle) * force * 2;
        }
        
        // 绘制霓虹线
        drawNeonLine(
          ctx, 
          line.startX, 
          line.startY, 
          line.endX, 
          line.endY,
          line.width,
          line.color,
          line.glowSize,
          pulseValue
        );
      });
      
      // 更新和绘制霓虹形状
      shapesRef.current.forEach(shape => {
        // 脉冲和旋转
        const pulseValue = 0.6 + Math.sin(timeRef.current * shape.pulseSpeed + shape.pulsePhase) * 0.4;
        shape.rotation += shape.rotationSpeed;
        
        // 移动位置
        shape.x += Math.sin(timeRef.current * 0.3 + shape.pulsePhase) * 0.5;
        shape.y += Math.cos(timeRef.current * 0.2 + shape.pulsePhase) * 0.5;
        
        // 绘制霓虹形状
        drawNeonPolygon(
          ctx,
          shape.x,
          shape.y,
          shape.size * pulseValue,
          shape.sides,
          shape.rotation,
          shape.color,
          pulseValue
        );
      });
      
      mouseRef.current.active = false;
      frameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
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
        background: 'black'
      }}
    />
  );
} 