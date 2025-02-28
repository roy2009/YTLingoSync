'use client';

import { useEffect, useRef } from 'react';

// 定义节点属性
interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  connections: number[];
  pulseSpeed: number;
  pulsePhase: number;
  pulseSize: number;
}

// 定义数据包属性
interface DataPacket {
  fromNode: number;
  toNode: number;
  x: number;
  y: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

export default function NetworkFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  const activeNodeRef = useRef<number | null>(null);
  
  // 初始化网络流量图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 设置画布大小
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 重新生成节点和连接
      initNetwork();
    };
    
    // 生成随机颜色
    const getRandomColor = () => {
      const colors = [
        'rgba(0, 180, 220, alpha)',   // 青色
        'rgba(0, 220, 120, alpha)',   // 绿色
        'rgba(220, 180, 0, alpha)',   // 黄色
        'rgba(220, 100, 0, alpha)',   // 橙色
        'rgba(180, 120, 220, alpha)'  // 紫色
      ];
      
      return colors[Math.floor(Math.random() * colors.length)].replace('alpha', (Math.random() * 0.3 + 0.7) + '');
    };
    
    // 初始化网络
    const initNetwork = () => {
      // 创建节点
      const nodeCount = Math.max(15, Math.floor((canvas.width * canvas.height) / 40000));
      const nodes: Node[] = [];
      
      // 创建节点
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 3 + 3,
          color: getRandomColor(),
          connections: [],
          pulseSpeed: 0.02 + Math.random() * 0.03,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSize: 0
        });
      }
      
      // 为每个节点创建连接
      for (let i = 0; i < nodes.length; i++) {
        // 每个节点连接2-5个其他节点
        const connectionCount = Math.floor(Math.random() * 4) + 2;
        
        // 找到最近的几个节点进行连接
        const distances: {index: number, dist: number}[] = [];
        
        for (let j = 0; j < nodes.length; j++) {
          if (i !== j) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            distances.push({index: j, dist});
          }
        }
        
        // 按距离排序
        distances.sort((a, b) => a.dist - b.dist);
        
        // 连接最近的几个节点
        for (let k = 0; k < Math.min(connectionCount, distances.length); k++) {
          nodes[i].connections.push(distances[k].index);
        }
      }
      
      nodesRef.current = nodes;
      packetsRef.current = [];
    };
    
    // 创建数据包
    const createDataPacket = (fromIndex: number, toIndex: number) => {
      const fromNode = nodesRef.current[fromIndex];
      const toNode = nodesRef.current[toIndex];
      
      packetsRef.current.push({
        fromNode: fromIndex,
        toNode: toIndex,
        x: fromNode.x,
        y: fromNode.y,
        progress: 0,
        speed: 0.01 + Math.random() * 0.02,
        color: fromNode.color,
        size: 2 + Math.random() * 2
      });
    };
    
    // 监听鼠标移动
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      
      // 检测鼠标是否悬停在节点上
      const nodes = nodesRef.current;
      let hoveredNode = null;
      
      for (let i = 0; i < nodes.length; i++) {
        const dx = mouseRef.current.x - nodes[i].x;
        const dy = mouseRef.current.y - nodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < nodes[i].radius * 2) {
          hoveredNode = i;
          break;
        }
      }
      
      // 如果鼠标悬停在节点上，将其设为活动节点
      if (hoveredNode !== null && hoveredNode !== activeNodeRef.current) {
        activeNodeRef.current = hoveredNode;
        
        // 从活动节点发送数据包到所有连接的节点
        const node = nodes[hoveredNode];
        node.connections.forEach(connIndex => {
          createDataPacket(hoveredNode, connIndex);
        });
      } else if (hoveredNode === null) {
        activeNodeRef.current = null;
      }
    };
    
    // 渲染网络流量图
    const render = () => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // 清除画布
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const nodes = nodesRef.current;
      
      // 绘制连接线
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        for (let j = 0; j < node.connections.length; j++) {
          const connectedNode = nodes[node.connections[j]];
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          ctx.stroke();
        }
      }
      
      // 更新和绘制数据包
      const packets = packetsRef.current;
      for (let i = packets.length - 1; i >= 0; i--) {
        const packet = packets[i];
        const fromNode = nodes[packet.fromNode];
        const toNode = nodes[packet.toNode];
        
        // 更新数据包位置
        packet.progress += packet.speed;
        
        if (packet.progress >= 1) {
          // 数据包到达目标节点，移除
          packets.splice(i, 1);
          
          // 有概率从目标节点继续发送数据包
          if (Math.random() < 0.3) {
            const nextConnections = toNode.connections;
            if (nextConnections.length > 0) {
              const nextNodeIndex = nextConnections[Math.floor(Math.random() * nextConnections.length)];
              createDataPacket(packet.toNode, nextNodeIndex);
            }
          }
          
          continue;
        }
        
        // 计算当前位置
        packet.x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        packet.y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;
        
        // 绘制数据包
        ctx.fillStyle = packet.color;
        ctx.beginPath();
        ctx.arc(packet.x, packet.y, packet.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 更新和绘制节点
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // 更新节点位置
        node.x += node.vx;
        node.y += node.vy;
        
        // 边界检查
        if (node.x < node.radius) {
          node.x = node.radius;
          node.vx *= -1;
        } else if (node.x > canvas.width - node.radius) {
          node.x = canvas.width - node.radius;
          node.vx *= -1;
        }
        
        if (node.y < node.radius) {
          node.y = node.radius;
          node.vy *= -1;
        } else if (node.y > canvas.height - node.radius) {
          node.y = canvas.height - node.radius;
          node.vy *= -1;
        }
        
        // 更新脉冲效果
        node.pulsePhase += node.pulseSpeed;
        node.pulseSize = Math.sin(node.pulsePhase) * 3;
        
        // 鼠标交互：鼠标附近的节点会被吸引
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const force = (150 - distance) / 30000;
          node.vx += dx * force;
          node.vy += dy * force;
          
          // 限制最大速度
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > 2) {
            node.vx = (node.vx / speed) * 2;
            node.vy = (node.vy / speed) * 2;
          }
        }
        
        // 绘制节点
        // 如果是活动节点，绘制更大的发光效果
        if (i === activeNodeRef.current) {
          const gradient = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, node.radius * 8
          );
          
          const baseColor = node.color.replace('rgba', 'rgba').replace(')', ', 0.7)');
          const fadeColor = node.color.replace('rgba', 'rgba').replace(')', ', 0)');
          
          gradient.addColorStop(0, baseColor);
          gradient.addColorStop(1, fadeColor);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 绘制节点脉冲效果
        const pulseRadius = node.radius + node.pulseSize;
        if (pulseRadius > node.radius) {
          ctx.fillStyle = node.color.replace('rgba', 'rgba').replace(')', ', 0.3)');
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 绘制节点主体
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 随机创建新的数据包
      if (Math.random() < 0.05 && nodes.length > 0) {
        const fromIndex = Math.floor(Math.random() * nodes.length);
        const connections = nodes[fromIndex].connections;
        
        if (connections.length > 0) {
          const toIndex = connections[Math.floor(Math.random() * connections.length)];
          createDataPacket(fromIndex, toIndex);
        }
      }
      
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
      className="network-flow-background"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}
    />
  );
}