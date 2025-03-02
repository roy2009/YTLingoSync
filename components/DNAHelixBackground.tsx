'use client';

import { useEffect, useRef } from 'react';

interface StrandPoint {
  x: number;
  y: number;
  z: number;
  colorIndex: number;
  opacity: number;
  size: number;
}

interface Connection {
  from: number;
  to: number;
  color: string;
  opacity: number;
}

export default function DNAHelixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strand1Ref = useRef<StrandPoint[]>([]);
  const strand2Ref = useRef<StrandPoint[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const frameIdRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  // 核苷酸配对的颜色映射
  const colorPairsRef = useRef([
    // 腺嘌呤 - 胸腺嘧啶
    { base1: 'rgba(0, 150, 255, alpha)', base2: 'rgba(255, 100, 100, alpha)' },
    // 鸟嘌呤 - 胞嘧啶 
    { base1: 'rgba(100, 255, 150, alpha)', base2: 'rgba(255, 200, 50, alpha)' }
  ]);
  const connectionColorRef = useRef('rgba(220, 220, 255, alpha)');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      generateDNAStrands();
    };

    // 生成DNA链的点
    const generateDNAStrands = () => {
      const strand1: StrandPoint[] = [];
      const strand2: StrandPoint[] = [];
      const connections: Connection[] = [];
      
      // 两条链的扭曲参数
      const strandWidth = Math.min(300, canvas.width * 0.2);
      const length = Math.max(50, Math.floor(canvas.height / 15));
      const twistFactor = 0.1; // 螺旋扭曲的紧密程度
      
      // 生成双链上的点
      for (let i = 0; i < length; i++) {
        // 垂直分布
        const y = (i / length) * canvas.height * 1.2 - canvas.height * 0.1;
        
        // 螺旋位置计算
        const angle = i * twistFactor;
        const xOffset1 = Math.sin(angle) * strandWidth / 2;
        const zOffset1 = Math.cos(angle) * strandWidth / 2;
        
        // 第二条链与第一条链相对位置偏移PI
        const xOffset2 = Math.sin(angle + Math.PI) * strandWidth / 2;
        const zOffset2 = Math.cos(angle + Math.PI) * strandWidth / 2;
        
        // 每个点的基本位置
        const centerX = canvas.width / 2;
        
        // 随机选择核苷酸对的颜色索引
        const colorIndex = Math.floor(Math.random() * colorPairsRef.current.length);
        
        // 第一条链上的点
        strand1.push({
          x: centerX + xOffset1,
          y: y,
          z: zOffset1,
          colorIndex,
          opacity: 0.7 + Math.random() * 0.3,
          size: 4 + Math.random() * 3
        });
        
        // 第二条链上的点
        strand2.push({
          x: centerX + xOffset2,
          y: y,
          z: zOffset2,
          colorIndex,
          opacity: 0.7 + Math.random() * 0.3,
          size: 4 + Math.random() * 3
        });
        
        // 创建两条链之间的连接
        if (i > 0 && i % 2 === 0) { // 每隔一个点创建连接
          connections.push({
            from: i,
            to: i,
            color: connectionColorRef.current,
            opacity: 0.3 + Math.random() * 0.3
          });
        }
      }
      
      strand1Ref.current = strand1;
      strand2Ref.current = strand2;
      connectionsRef.current = connections;
    };

    // 渲染DNA螺旋
    const render = () => {
      if (!ctx || !canvas) return;
      
      // 清除画布
      ctx.fillStyle = 'rgba(5, 10, 30, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 更新旋转角度
      rotationRef.current += 0.005;
      
      // 组合两条链的点以便按照z轴深度排序
      const allPoints: Array<{point: StrandPoint, isStrand1: boolean, index: number}> = [
        ...strand1Ref.current.map((point, index) => ({ point, isStrand1: true, index })),
        ...strand2Ref.current.map((point, index) => ({ point, isStrand1: false, index }))
      ];
      
      // 应用旋转 - 绕Y轴旋转
      allPoints.forEach(item => {
        const cos = Math.cos(rotationRef.current);
        const sin = Math.sin(rotationRef.current);
        
        // 临时保存原始z坐标
        const originalZ = item.point.z;
        
        // 围绕Y轴旋转
        item.point.x = (item.point.x - canvas.width / 2) * cos - originalZ * sin + canvas.width / 2;
        item.point.z = (item.point.x - canvas.width / 2) * sin + originalZ * cos;
        
        // 添加鼠标交互 - 鼠标附近的点会有轻微移动
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - item.point.x;
          const dy = mouseRef.current.y - item.point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 200) {
            const force = (200 - distance) / 200 * 5;
            item.point.x += (Math.random() - 0.5) * force;
            item.point.y += (Math.random() - 0.5) * force;
          }
        }
      });
      
      // 按z轴深度排序所有点
      allPoints.sort((a, b) => a.point.z - b.point.z);
      
      // 绘制链间连接
      connectionsRef.current.forEach(conn => {
        if (conn.from < strand1Ref.current.length && conn.to < strand2Ref.current.length) {
          const p1 = strand1Ref.current[conn.from];
          const p2 = strand2Ref.current[conn.to];
          
          // 计算连接的深度，用于透明度
          const avgZ = (p1.z + p2.z) / 2;
          const zFactor = (avgZ + 150) / 300; // 归一化z值
          const opacity = conn.opacity * Math.max(0.2, Math.min(1, zFactor));
          
          // 绘制连接线
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = connectionColorRef.current.replace('alpha', opacity.toString());
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      
      // 绘制所有点
      allPoints.forEach(item => {
        const { point, isStrand1, index } = item;
        
        // 根据z坐标计算点的大小和透明度
        const zFactor = (point.z + 150) / 300; // 归一化z值
        const size = point.size * Math.max(0.6, Math.min(1.2, zFactor));
        const opacity = point.opacity * Math.max(0.2, Math.min(1, zFactor));
        
        // 选择颜色
        const colorPair = colorPairsRef.current[point.colorIndex];
        const color = isStrand1 
          ? colorPair.base1.replace('alpha', opacity.toString())
          : colorPair.base2.replace('alpha', opacity.toString());
        
        // 绘制核苷酸
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        // 添加发光效果
        ctx.shadowBlur = 10;
        ctx.shadowColor = color.replace('alpha', '0.5');
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 绘制链上连续点之间的连接
        if (index > 0) {
          const prevIndex = index - 1;
          const prevPoint = isStrand1 
            ? strand1Ref.current[prevIndex] 
            : strand2Ref.current[prevIndex];
          
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.strokeStyle = color.replace('alpha', (opacity * 0.6).toString());
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      
      frameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    // 初始化
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    frameIdRef.current = requestAnimationFrame(render);

    // 清理
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
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
        background: 'linear-gradient(to bottom, #030514 0%, #0a1a3f 100%)'
      }}
    />
  );
} 