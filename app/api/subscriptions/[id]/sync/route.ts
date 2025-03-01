export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { syncSubscription } from '@/lib/sync-service';
import { getEnvSetting } from '@/lib/env-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 确保先await params对象
  const paramsObj = await params;
  const subscriptionId = paramsObj.id;
  
  try {
    // 获取翻译服务设置
    const translationService = getEnvSetting('TRANSLATION_SERVICE') || 'none';
    const logs: string[] = [`翻译服务: ${translationService}`];
    
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
    } catch (error: any) {
      logger.error(`同步订阅失败: ${subscription.id}`, error, 'subscription-sync');
      logs.push(`❌ 同步失败: ${error.message || '未知错误'}`);
      
      return NextResponse.json(
        { error: `同步失败: ${error.message || '未知错误'}`, logs },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('处理同步请求失败', error, 'subscription-sync');
    return NextResponse.json(
      { error: '处理同步请求失败', logs: ['❌ 处理请求失败'] },
      { status: 500 }
    );
  }
} 