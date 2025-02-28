import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setupProxy } from '@/lib/proxy';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    
    if (!ids) {
      return NextResponse.json({ error: '未提供频道ID' }, { status: 400 });
    }
    
    const channelIds = ids.split(',');
    
    // 从数据库中查询订阅信息，获取频道缩略图
    const subscriptions = await prisma.subscription.findMany({
      where: {
        type: 'channel',
        sourceId: { in: channelIds }
      },
      select: {
        sourceId: true,
        name: true,
        thumbnailUrl: true
      }
    });
    
    // 将数据转换为前端所需格式
    const channelsInfo = subscriptions.map(sub => ({
      id: sub.sourceId,
      title: sub.name,
      thumbnailUrl: sub.thumbnailUrl
    }));
    
    return NextResponse.json(channelsInfo);
  } catch (error) {
    logger.error('获取频道信息失败', error);
    return NextResponse.json(
      { error: '获取频道信息失败' },
      { status: 500 }
    );
  }
} 