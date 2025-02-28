import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 获取所有表名
    const tables = [
      'Subscription',
      'Video',
      'Translation',
      'Setting',
      'Log'
    ];
    
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('获取数据表失败:', error);
    return NextResponse.json({ error: '获取数据表失败' }, { status: 500 });
  }
} 