import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 计算缺少时长信息的视频数量
    const count = await prisma.video.count({
      where: { duration: null }
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('获取缺失数量失败', error);
    return NextResponse.json(
      { error: '获取缺失数量失败' }, 
      { status: 500 }
    );
  }
} 