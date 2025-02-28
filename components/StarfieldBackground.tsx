'use client';

import { useEffect, useRef } from 'react';

// 星星属性定义
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  twinkleSpeed: number;
  twinkleDir: number;
}

// 添加太阳属性定义
interface Sun {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
}

// 随机颜色函数
const getRandomColor = () => {
  // 使用灰色调，符合我们的灰色主题
  const colors = [
    'rgba(156, 163, 175, alpha)', // 浅灰色
    'rgba(107, 114, 128, alpha)', // 中灰色
    'rgba(75, 85, 99, alpha)',    // 深灰色
    'rgba(209, 213, 219, alpha)', // 亮灰色
  ];
  
  return colors[Math.floor(Math.random() * colors.length)].replace('alpha', Math.random() * 0.4 + 0.6 + '');
};

// 生成随机星星
const createStar = (canvas: HTMLCanvasElement): Star => {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.1 + 0.05,
    opacity: Math.random() * 0.5 + 0.3,
    color: getRandomColor(),
    twinkleSpeed: Math.random() * 0.01 + 0.003,
    twinkleDir: Math.random() > 0.5 ? 1 : -1
  };
};

// 创建三体太阳
const createThreeBodySuns = (canvas: HTMLCanvasElement): Sun[] => {
  // 中心位置
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const distFromCenter = Math.min(canvas.width, canvas.height) / 5;
  
  return [
    {
      x: centerX + distFromCenter * Math.cos(0),
      y: centerY + distFromCenter * Math.sin(0),
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * 0.4 - 0.2,
      mass: 20000 + Math.random() * 10000,
      radius: 20 + Math.random() * 10,
      color: 'rgb(255, 100, 50)' // 红色太阳
    },
    {
      x: centerX + distFromCenter * Math.cos(2 * Math.PI / 3),
      y: centerY + distFromCenter * Math.sin(2 * Math.PI / 3),
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * 0.4 - 0.2,
      mass: 20000 + Math.random() * 10000,
      radius: 20 + Math.random() * 10,
      color: 'rgb(50, 150, 255)' // 蓝色太阳
    },
    {
      x: centerX + distFromCenter * Math.cos(4 * Math.PI / 3),
      y: centerY + distFromCenter * Math.sin(4 * Math.PI / 3),
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * 0.4 - 0.2,
      mass: 20000 + Math.random() * 10000,
      radius: 20 + Math.random() * 10,
      color: 'rgb(255, 200, 50)' // 黄色太阳
    }
  ];
};

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const sunsRef = useRef<Sun[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  
  // 初始化星空
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 设置画布大小
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 重新生成星星
      const starCount = Math.floor((canvas.width * canvas.height) / 6000);
      starsRef.current = Array.from({ length: starCount }, () => createStar(canvas));
      
      // 初始化三体太阳
      sunsRef.current = createThreeBodySuns(canvas);
    };
    
    // 监听鼠标移动
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    // 更新三体太阳的位置
    const updateSuns = () => {
      const suns = sunsRef.current;
      const G = 0.01; // 引力常数
      
      // 计算太阳之间的引力
      for (let i = 0; i < suns.length; i++) {
        for (let j = i + 1; j < suns.length; j++) {
          const dx = suns[j].x - suns[i].x;
          const dy = suns[j].y - suns[i].y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          // 避免太阳重叠时引力过大
          if (dist < suns[i].radius + suns[j].radius) continue;
          
          // 计算引力大小
          const force = G * suns[i].mass * suns[j].mass / distSq;
          const forceX = force * dx / dist;
          const forceY = force * dy / dist;
          
          // 根据牛顿第二定律更新速度
          suns[i].vx += forceX / suns[i].mass;
          suns[i].vy += forceY / suns[i].mass;
          suns[j].vx -= forceX / suns[j].mass;
          suns[j].vy -= forceY / suns[j].mass;
        }
      }
      
      // 更新太阳位置
      suns.forEach(sun => {
        sun.x += sun.vx;
        sun.y += sun.vy;
        
        // 处理边界反弹
        if (sun.x < sun.radius) {
          sun.x = sun.radius;
          sun.vx *= -0.8;
        } else if (sun.x > canvas.width - sun.radius) {
          sun.x = canvas.width - sun.radius;
          sun.vx *= -0.8;
        }
        
        if (sun.y < sun.radius) {
          sun.y = sun.radius;
          sun.vy *= -0.8;
        } else if (sun.y > canvas.height - sun.radius) {
          sun.y = canvas.height - sun.radius;
          sun.vy *= -0.8;
        }
      });
    };
    
    // 渲染星空
    const render = () => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 更新和绘制星星
      starsRef.current.forEach(star => {
        // 星星闪烁效果
        star.opacity += star.twinkleSpeed * star.twinkleDir;
        if (star.opacity > 1) {
          star.opacity = 1;
          star.twinkleDir = -1;
        } else if (star.opacity < 0.3) {
          star.opacity = 0.3;
          star.twinkleDir = 1;
        }
        
        // 星星移动
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        
        // 计算与鼠标的距离影响
        const dx = mouseRef.current.x - star.x;
        const dy = mouseRef.current.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 星星受鼠标引力影响
        if (distance < 120) {
          const angle = Math.atan2(dy, dx);
          const force = (120 - distance) / 1500;
          star.x -= Math.cos(angle) * force;
          star.y -= Math.sin(angle) * force;
        }
        
        // 绘制星星
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // 更新三体太阳
      updateSuns();
      
      // 绘制太阳发光效果
      sunsRef.current.forEach(sun => {
        // 外发光
        const gradient = ctx.createRadialGradient(
          sun.x, sun.y, sun.radius * 0.5,
          sun.x, sun.y, sun.radius * 3
        );
        
        // 使用正确的 rgba 格式转换颜色
        const baseColor = sun.color.replace('rgb', 'rgba').replace(')', ', 0.7)');
        const fadeColor = sun.color.replace('rgb', 'rgba').replace(')', ', 0)');
        
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, fadeColor);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 太阳主体
        ctx.fillStyle = sun.color.replace('rgb', 'rgba').replace(')', ', 0.9)');
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      frameIdRef.current = requestAnimationFrame(render);
    };
    
    // 初始化和监听事件
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('mousemove', handleMouseMove);
    frameIdRef.current = requestAnimationFrame(render);
    
    // 清理函数
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="starfield-container"
      style={{ pointerEvents: 'none' }}
    />
  );
} 