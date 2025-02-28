import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  
  // 设置SSE响应头
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // 发送初始数据
  const initialLogs = await fetchLogs(level);
  writer.write(encoder.encode(`data: ${JSON.stringify({ logs: initialLogs })}\n\n`));
  
  // 创建轮询间隔
  const interval = setInterval(async () => {
    try {
      const logs = await fetchLogs(level);
      writer.write(encoder.encode(`data: ${JSON.stringify({ logs })}\n\n`));
    } catch (error) {
      console.error('轮询日志失败:', error);
    }
  }, 2000);
  
  // 当连接关闭时清理
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

async function fetchLogs(level: string | null) {
  let where = {};
  
  if (level && level !== 'all') {
    where = { level };
  }
  
  return await prisma.log.findMany({
    where,
    orderBy: {
      timestamp: 'desc'
    },
    take: 100
  });
} 