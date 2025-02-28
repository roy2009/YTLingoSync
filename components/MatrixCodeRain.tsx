'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Character {
  x: number;
  y: number;
  value: string;
  speed: number;
  opacity: number;
  fontSize: number;
}

interface Column {
  x: number;
  chars: Character[];
  speed: number;
}

export default function OptimizedCyberRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const frameIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const lastFrameTimeRef = useRef(0);
  const charSet = useRef('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*');

  // 性能优化配置
  const CONFIG = useRef({
    FONT_SIZE: 14,
    COLUMN_SPACING: 18,
    MAX_FPS: 60,
    MOUSE_RADIUS: 150,
    CHAR_UPDATE_PROB: 0.02,
    BACKGROUND_OPACITY: 0.06
  });

  const getRandomChar = useCallback(() => {
    return charSet.current[Math.floor(Math.random() * charSet.current.length)];
  }, []);

  const initColumns = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const columnCount = Math.floor(canvas.width / CONFIG.current.COLUMN_SPACING);
    const columns: Column[] = [];

    for (let i = 0; i < columnCount; i++) {
      const x = i * CONFIG.current.COLUMN_SPACING;
      const speed = 1 + Math.random() * 2;
      
      const chars: Character[] = [];
      const charCount = 10 + Math.floor(Math.random() * 15);
      
      for (let j = 0; j < charCount; j++) {
        chars.push({
          x,
          y: -j * CONFIG.current.FONT_SIZE,
          value: getRandomChar(),
          speed,
          opacity: Math.max(0.2, 1 - j/charCount),
          fontSize: CONFIG.current.FONT_SIZE
        });
      }

      columns.push({ x, chars, speed });
    }

    columnsRef.current = columns;
  }, [getRandomChar]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // 背景渐变
    ctx.fillStyle = `rgba(10, 0, 20, ${CONFIG.current.BACKGROUND_OPACITY})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 预计算鼠标位置
    const mouseX = mouseRef.current.x;
    const mouseY = mouseRef.current.y;
    const radiusSq = CONFIG.current.MOUSE_RADIUS * CONFIG.current.MOUSE_RADIUS;

    columnsRef.current.forEach(column => {
      column.chars.forEach((char, index) => {
        // 位置更新
        char.y += char.speed;

        // 边界重置
        if (char.y > canvas.height + 50) {
          char.y = -CONFIG.current.FONT_SIZE;
          char.opacity = 1;
          char.value = getRandomChar();
        }

        // 动态透明度
        char.opacity = Math.max(0.1, char.opacity - 0.002);

        // 鼠标交互计算（使用平方比较优化性能）
        const dx = mouseX - char.x;
        const dy = mouseY - char.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < radiusSq) {
          const force = (1 - Math.sqrt(distSq)/CONFIG.current.MOUSE_RADIUS) * 0.5;
          char.x += (Math.random() - 0.5) * force * 8;
          char.y -= force * 4;
          char.opacity = Math.min(1, char.opacity + force);
        }

        // 字符更新
        if (Math.random() < CONFIG.current.CHAR_UPDATE_PROB) {
          char.value = getRandomChar();
        }

        // 颜色渐变
        const colorValue = 150 + Math.sin(Date.now()/1000 + char.x)*105;
        ctx.fillStyle = `rgba(${colorValue}, ${50 + index*5}, 255, ${char.opacity})`;

        // 绘制字符
        ctx.font = `${char.fontSize}px monospace`;
        ctx.fillText(char.value, char.x, char.y);
      });
    });
  }, [getRandomChar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    };

    const animate = (timestamp: number) => {
      // 帧率控制
      const deltaTime = timestamp - lastFrameTimeRef.current;
      if (deltaTime < 1000 / CONFIG.current.MAX_FPS) {
        frameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      lastFrameTimeRef.current = timestamp;
      renderFrame(ctx, canvas);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    // 初始化
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('mousemove', handleMouseMove);
    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove, initColumns, renderFrame]);

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
        background: 'radial-gradient(circle at 50% 50%, #0a0010 0%, #200030 100%)'
      }}
    />
  );
}