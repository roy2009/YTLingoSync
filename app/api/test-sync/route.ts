import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { syncSubscription } from '@/lib/video-processor';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少订阅ID' }, { status: 400 });
    }
    
    // 获取订阅
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      return NextResponse.json({ error: '未找到订阅' }, { status: 404 });
    }
    
    // 检查翻译服务
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    
    // 手动测试同步一个视频，重点检查翻译
    const logs = [];
    const result = await syncSubscription(subscription, logs, { maxVideos: 1 });
    
    return NextResponse.json({
      message: '测试同步完成',
      subscription: subscription.name,
      translationService,
      result,
      logs
    });
  } catch (error) {
    logger.error('测试同步失败:', error);
    return NextResponse.json({ error: '测试同步失败', message: error.message }, { status: 500 });
  }
} 