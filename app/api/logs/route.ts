import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取日志
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    
    const logs = await prisma.log.findMany({
      where: level && level !== 'all' ? { level } : undefined,
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // 限制返回最近的100条日志
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json(
      { error: '获取日志失败' },
      { status: 500 }
    );
  }
}

// 清除所有日志
export async function DELETE() {
  try {
    await prisma.log.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('清除日志失败:', error);
    return NextResponse.json(
      { error: '清除日志失败' },
      { status: 500 }
    );
  }
} 