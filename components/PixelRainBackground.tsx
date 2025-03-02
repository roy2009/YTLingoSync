'use client';

import { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  opacity: number;
  rotationSpeed: number;
  rotation: number;
}

export default function PixelRainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, radius: 100 });
  const frameIdRef = useRef<number>(0);
  const colorRef = useRef({ r: 0, g: 182, b: 255 }); // 默认蓝色系

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPixels();
    };

    // 生成像素颜色
    const getPixelColor = () => {
      // 随机在主色调范围内选择颜色
      const r = colorRef.current.r + Math.floor(Math.random() * 30);
      const g = colorRef.current.g + Math.floor(Math.random() * 30);
      const b = colorRef.current.b + Math.floor(Math.random() * 30);
      return `rgb(${r}, ${g}, ${b})`;
    };

    // 初始化像素雨
    const initPixels = () => {
      const pixelCount = Math.floor((canvas.width * canvas.height) / 10000);
      const pixels: Pixel[] = [];

      for (let i = 0; i < pixelCount; i++) {
        pixels.push(createPixel(canvas));
      }

      pixelsRef.current = pixels;
    };

    // 创建像素
    const createPixel = (canvas: HTMLCanvasElement, yPos?: number): Pixel => {
      const size = 5 + Math.floor(Math.random() * 15); // 5-20像素大小
      return {
        x: Math.random() * canvas.width,
        y: yPos !== undefined ? yPos : -size - Math.random() * canvas.height,
        size,
        color: getPixelColor(),
        speed: 1 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.7,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        rotation: Math.random() * Math.PI * 2
      };
    };

    // 绘制像素
    const drawPixel = (ctx: CanvasRenderingContext2D, pixel: Pixel) => {
      ctx.save();
      ctx.translate(pixel.x, pixel.y);
      ctx.rotate(pixel.rotation);
      
      // 像素主体
      ctx.fillStyle = pixel.color.replace('rgb', 'rgba').replace(')', `, ${pixel.opacity})`);
      ctx.fillRect(-pixel.size / 2, -pixel.size / 2, pixel.size, pixel.size);
      
      // 像素内部结构（类似电路图案）
      ctx.strokeStyle = `rgba(255, 255, 255, ${pixel.opacity * 0.5})`;
      ctx.lineWidth = 1;
      
      // 绘制像素内部电路样式图案
      const innerSize = pixel.size * 0.7;
      const padding = (pixel.size - innerSize) / 2;
      
      // 水平线
      ctx.beginPath();
      ctx.moveTo(-pixel.size / 2 + padding, 0);
      ctx.lineTo(pixel.size / 2 - padding, 0);
      ctx.stroke();
      
      // 垂直线
      ctx.beginPath();
      ctx.moveTo(0, -pixel.size / 2 + padding);
      ctx.lineTo(0, pixel.size / 2 - padding);
      ctx.stroke();
      
      // 随机额外线条
      if (pixel.size > 10) {
        const quarterSize = pixel.size / 4;
        
        ctx.beginPath();
        ctx.moveTo(quarterSize, -quarterSize);
        ctx.lineTo(quarterSize, quarterSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-quarterSize, -quarterSize);
        ctx.lineTo(-quarterSize, quarterSize);
        ctx.stroke();
      }
      
      ctx.restore();
    };

    // 渲染帧
    const render = () => {
      if (!ctx || !canvas) return;

      // 清除画布
      ctx.fillStyle = 'rgba(10, 10, 25, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 渐变色变化
      colorRef.current.r = 20 + Math.sin(Date.now() * 0.001) * 20;
      
      // 更新和绘制像素
      pixelsRef.current.forEach((pixel, index) => {
        // 更新位置
        pixel.y += pixel.speed;
        pixel.rotation += pixel.rotationSpeed;
        
        // 边界检查和重置
        if (pixel.y > canvas.height + pixel.size) {
          pixelsRef.current[index] = createPixel(canvas, -pixel.size);
        }
        
        // 鼠标交互
        const dx = mouseRef.current.x - pixel.x;
        const dy = mouseRef.current.y - pixel.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseRef.current.radius) {
          // 在鼠标附近的像素会被散开
          const angle = Math.atan2(dy, dx);
          const force = 1 - distance / mouseRef.current.radius;
          
          pixel.x -= Math.cos(angle) * force * 5;
          pixel.x = Math.max(0, Math.min(canvas.width, pixel.x));
          
          // 加速下落
          pixel.speed += force * 2;
          pixel.rotationSpeed += force * 0.1;
        }
        
        // 绘制像素
        drawPixel(ctx, pixel);
      });
      
      // 随机添加新像素
      if (Math.random() < 0.05) {
        pixelsRef.current.push(createPixel(canvas, 0));
      }
      
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

    // 清理
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
        background: 'linear-gradient(to bottom, #000428 0%, #004e92 100%)'
      }}
    />
  );
} 