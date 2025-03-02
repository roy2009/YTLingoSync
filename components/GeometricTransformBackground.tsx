'use client';

import { useEffect, useRef } from 'react';

interface Shape {
  points: { x: number; y: number }[];
  targetPoints: { x: number; y: number }[];
  color: string;
  rotation: number;
  rotationSpeed: number;
  transitionProgress: number;
  transitionSpeed: number;
  scale: number;
  targetScale: number;
}

export default function GeometricTransformBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  const timeRef = useRef(0);
  const colorsRef = useRef([
    'rgba(255, 107, 129, 0.4)',  // 玫瑰红
    'rgba(42, 157, 244, 0.4)',   // 蓝色
    'rgba(106, 176, 76, 0.4)',   // 绿色
    'rgba(235, 179, 32, 0.4)',   // 黄色
    'rgba(168, 109, 217, 0.4)'   // 紫色
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initShapes();
    };

    // 创建随机多边形
    const createPolygon = (
      centerX: number, 
      centerY: number, 
      radius: number, 
      sides: number,
      irregularity: number = 0.2
    ) => {
      const points = [];
      const angleStep = (Math.PI * 2) / sides;

      for (let i = 0; i < sides; i++) {
        const angle = i * angleStep;
        // 添加不规则性
        const currentRadius = radius * (1 + (Math.random() * 2 - 1) * irregularity);
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;
        points.push({ x, y });
      }

      return points;
    };

    // 生成不同的目标形状
    const generateNewTargetShape = (shape: Shape) => {
      // 获取当前形状的中心点
      let centerX = 0, centerY = 0;
      shape.points.forEach(point => {
        centerX += point.x;
        centerY += point.y;
      });
      centerX /= shape.points.length;
      centerY /= shape.points.length;

      // 生成新的随机边数
      const sides = Math.floor(Math.random() * 4) + 3; // 3-6边形
      const newRadius = 50 + Math.random() * 150;
      const newTargetPoints = createPolygon(centerX, centerY, newRadius, sides, 0.3);
      
      // 为移动增加随机性
      const offsetX = (Math.random() - 0.5) * canvas.width * 0.2;
      const offsetY = (Math.random() - 0.5) * canvas.height * 0.2;
      
      newTargetPoints.forEach(point => {
        point.x += offsetX;
        point.y += offsetY;
        
        // 确保点在画布内
        point.x = Math.max(0, Math.min(canvas.width, point.x));
        point.y = Math.max(0, Math.min(canvas.height, point.y));
      });
      
      return newTargetPoints;
    };

    // 初始化形状
    const initShapes = () => {
      const shapeCount = Math.max(5, Math.floor(canvas.width / 300));
      const shapes: Shape[] = [];

      for (let i = 0; i < shapeCount; i++) {
        const centerX = Math.random() * canvas.width;
        const centerY = Math.random() * canvas.height;
        const radius = 50 + Math.random() * 150;
        const sides = Math.floor(Math.random() * 4) + 3; // 3-6边形
        
        const points = createPolygon(centerX, centerY, radius, sides, 0.3);
        const targetPoints = generateNewTargetShape({ 
          points, 
          targetPoints: [], 
          color: '', 
          rotation: 0, 
          rotationSpeed: 0, 
          transitionProgress: 0, 
          transitionSpeed: 0,
          scale: 0,
          targetScale: 0
        });
        
        shapes.push({
          points: [...points],
          targetPoints,
          color: colorsRef.current[Math.floor(Math.random() * colorsRef.current.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          transitionProgress: 0,
          transitionSpeed: 0.003 + Math.random() * 0.005,
          scale: 0.7 + Math.random() * 0.6,
          targetScale: 0.7 + Math.random() * 0.6
        });
      }

      shapesRef.current = shapes;
    };

    // 绘制形状
    const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      if (shape.points.length < 3) return;
      
      ctx.save();
      
      // 计算中心点
      let centerX = 0, centerY = 0;
      shape.points.forEach(point => {
        centerX += point.x;
        centerY += point.y;
      });
      centerX /= shape.points.length;
      centerY /= shape.points.length;
      
      // 应用旋转
      ctx.translate(centerX, centerY);
      ctx.rotate(shape.rotation);
      ctx.scale(shape.scale, shape.scale);
      ctx.translate(-centerX, -centerY);
      
      // 绘制形状
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      
      ctx.closePath();
      
      // 填充
      ctx.fillStyle = shape.color;
      ctx.fill();
      
      // 描边
      ctx.strokeStyle = shape.color.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)');
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    };

    // 渲染
    const render = () => {
      if (!ctx || !canvas) return;
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 更新时间
      timeRef.current += 0.01;
      
      // 更新和绘制形状
      shapesRef.current.forEach(shape => {
        // 更新旋转
        shape.rotation += shape.rotationSpeed;
        
        // 更新过渡进度
        shape.transitionProgress += shape.transitionSpeed;
        
        // 形状变换
        if (shape.transitionProgress >= 1) {
          // 重置过渡
          shape.transitionProgress = 0;
          shape.points = [...shape.targetPoints];
          shape.targetPoints = generateNewTargetShape(shape);
          shape.color = colorsRef.current[Math.floor(Math.random() * colorsRef.current.length)];
          shape.targetScale = 0.7 + Math.random() * 0.6;
          shape.rotationSpeed = (Math.random() - 0.5) * 0.01;
        } else {
          // 平滑过渡到目标形状
          for (let i = 0; i < shape.points.length; i++) {
            if (i < shape.targetPoints.length) {
              const progress = Math.sin(shape.transitionProgress * Math.PI * 0.5); // 缓动函数
              shape.points[i].x = shape.points[i].x + (shape.targetPoints[i].x - shape.points[i].x) * progress * 0.02;
              shape.points[i].y = shape.points[i].y + (shape.targetPoints[i].y - shape.points[i].y) * progress * 0.02;
            }
          }
          
          // 平滑过渡到目标缩放
          shape.scale += (shape.targetScale - shape.scale) * 0.01;
        }
        
        // 鼠标交互
        let centerX = 0, centerY = 0;
        shape.points.forEach(point => {
          centerX += point.x;
          centerY += point.y;
        });
        centerX /= shape.points.length;
        centerY /= shape.points.length;
        
        const dx = mouseRef.current.x - centerX;
        const dy = mouseRef.current.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const angle = Math.atan2(dy, dx);
          const force = (200 - distance) / 200 * 0.5;
          
          // 鼠标附近的形状会轻微移动
          shape.points.forEach(point => {
            point.x -= Math.cos(angle) * force;
            point.y -= Math.sin(angle) * force;
          });
        }
        
        // 绘制形状
        drawShape(ctx, shape);
      });
      
      frameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
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
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}
    />
  );
} 