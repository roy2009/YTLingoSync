import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 获取订阅频道数量 - 检查模型是否存在
    let channelCount = 0;
    if (prisma.subscription) {
      channelCount = await prisma.subscription.count({
        where: { type: 'CHANNEL' }
      });
    }
    
    // 获取视频数量 - 检查模型是否存在
    let videoCount = 0;
    if (prisma.video) {
      videoCount = await prisma.video.count();
    }
    
    // 获取最近的同步记录 - 处理模型可能不存在的情况
    let latestSync = null;
    if ('syncLog' in prisma) {
      latestSync = await prisma.syncLog.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    }
    
    // 获取下一次计划同步时间 - 处理模型可能不存在的情况
    let nextScheduledSync = null;
    if ('scheduledTask' in prisma) {
      nextScheduledSync = await prisma.scheduledTask.findFirst({
        where: { type: 'SYNC', status: 'PENDING' },
        orderBy: { scheduledTime: 'asc' }
      });
    }
    
    // 根据同步记录状态设置显示文本
    let syncStatus = '未同步';
    if (latestSync) {
      syncStatus = latestSync.status === 'SUCCESS' ? '正常' : 
                  latestSync.status === 'FAILED' ? '失败' : 
                  latestSync.status === 'IN_PROGRESS' ? '同步中' : '未同步';
    }
    
    // 设置下次同步时间或默认值
    const nextSyncTime = nextScheduledSync?.scheduledTime || new Date(Date.now() + 3600000);
    
    return NextResponse.json({
      channelCount,
      videoCount,
      syncStatus,
      nextSyncTime: nextSyncTime.toISOString()
    });
  } catch (error) {
    console.error('获取仪表盘统计数据出错:', error);
    
    // 数据库查询失败时返回模拟数据而不是错误
    return NextResponse.json({
      channelCount: 0,
      videoCount: 0,
      syncStatus: '数据库连接错误',
      nextSyncTime: new Date(Date.now() + 3600000).toISOString()
    });
  }
} 