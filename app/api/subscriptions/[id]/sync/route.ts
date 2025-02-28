export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { syncSubscription } from '@/lib/video-processor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const subscriptionId = params.id;
  
  try {
    // 获取翻译服务设置
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    const logs = [`翻译服务: ${translationService}`];
    
    // 获取订阅信息
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription) {
      logs.push('❌ 未找到订阅');
      return NextResponse.json(
        { error: '未找到订阅', logs },
        { status: 404 }
      );
    }
    
    logs.push(`开始同步订阅: ${subscription.name}`);
    
    try {
      // 调用同步逻辑
      const result = await syncSubscription(subscription, logs);
      
      // 更新最后同步时间
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { lastSync: new Date() }
      });
      
      logs.push(`✅ 同步完成，已同步${result.syncedCount}个视频`);
      
      return NextResponse.json({
        message: '同步成功',
        syncedCount: result.syncedCount,
        logs
      });
    } catch (error) {
      logger.error(`同步订阅失败: ${subscription.id}`, error, 'subscription-sync');
      logs.push(`❌ 同步失败: ${error.message || '未知错误'}`);
      
      return NextResponse.json(
        { error: `同步失败: ${error.message || '未知错误'}`, logs },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('处理同步请求失败', error, 'subscription-sync');
    return NextResponse.json(
      { error: '处理同步请求失败', logs: ['❌ 处理请求失败'] },
      { status: 500 }
    );
  }
} 