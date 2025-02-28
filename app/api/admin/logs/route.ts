import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    let where = {};
    
    // 如果指定了日志级别且不是"all"，则根据级别过滤
    if (level && level !== 'all') {
      where = { level };
    }
    
    const logs = await prisma.log.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 });
  }
} 