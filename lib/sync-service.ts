import { prisma } from '@/lib/prisma';
import { fetchYouTubeData, parseDuration } from './youtube-api';
import { logger } from '@/lib/logger';
import { setupProxy } from '@/lib/proxy';
import { syncSubscription } from './video-processor';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';

let syncInterval: NodeJS.Timeout | null = null;

/**
 * 同步指定订阅的视频
 */
export async function syncSubscription(subscriptionId: string) {
  try {
    // 获取订阅信息
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription) {
      throw new Error(`订阅 ID ${subscriptionId} 不存在`);
    }
    
    logger.info(`开始同步订阅: ${subscription.name}`, { type: subscription.type });
    
    // 获取现有视频的YouTube ID列表，用于去重
    const existingVideos = await prisma.video.findMany({
      where: { subscriptionId },
      select: { youtubeId: true }
    });
    
    const existingIds = new Set(existingVideos.map(v => v.youtubeId));
    
    // 确定是否为首次同步（检查是否有关联的视频）
    const isFirstSync = existingVideos.length === 0;
    
    // 首次同步只获取3条，后续同步获取更多
    const maxResults = isFirstSync ? 3 : 50;
    
    // 获取上次同步时间，如果有的话
    const publishedAfter = isFirstSync 
      ? undefined 
      : new Date(subscription.lastSync);
    
    logger.info(`同步策略: ${isFirstSync ? '首次同步，获取最新3条' : '增量同步'}`);
    
    // 获取视频数据
    const videoData = await fetchYouTubeData({
      type: subscription.type,
      sourceId: subscription.sourceId,
      maxResults,
      publishedAfter
    });
    
    // 过滤掉已存在的视频
    const newVideos = videoData.filter(video => !existingIds.has(video.youtubeId));
    
    if (newVideos.length === 0) {
      logger.info(`订阅 ${subscription.name} 没有新视频`);
      
      // 即使没有新视频，也更新同步时间
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { lastSync: new Date() }
      });
      
      return { added: 0 };
    }
    
    // 准备要添加的视频数据
    const videosToCreate = newVideos.map(video => ({
      youtubeId: video.youtubeId,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      publishedAt: video.publishedAt,
      duration: video.duration,
      channelId: video.channelId,
      channelTitle: video.channelTitle,
      subscriptionId
    }));
    
    // 批量创建视频
    await prisma.video.createMany({
      data: videosToCreate
    });
    
    // 更新订阅的最后同步时间
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { lastSync: new Date() }
    });
    
    logger.info(`同步完成: ${subscription.name}，添加了 ${videosToCreate.length} 个视频`);
    
    return { added: videosToCreate.length };
  } catch (error) {
    logger.error(`同步订阅 ${subscriptionId} 失败`, error);
    throw error;
  }
}

export async function syncAllSubscriptions() {
  try {
    logger.info('开始同步所有订阅...');
    
    // 获取翻译服务设置
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    logger.info(`使用翻译服务: ${translationService}`);
    
    // 获取所有订阅
    const subscriptions = await prisma.subscription.findMany();
    logger.info(`找到 ${subscriptions.length} 个订阅`);
    
    // 同步每个订阅
    for (const subscription of subscriptions) {
      try {
        await syncSubscription(subscription.id);
      } catch (error) {
        logger.error(`同步订阅失败: ${subscription.id}`, error);
      }
    }
    
    logger.info('所有订阅同步完成');
  } catch (error) {
    logger.error('同步服务出错:', error);
  }
}

export function startSyncService() {
  // 读取设置
  const getIntervalFromSettings = async () => {
    try {
      const setting = await prisma.setting.findUnique({
        where: { id: 'SYNC_INTERVAL_MINUTES' }
      });
      return setting ? parseInt(setting.value) : 15; // 默认15分钟
    } catch (error) {
      logger.error('获取同步间隔设置失败', error);
      return 15; // 默认值
    }
  };

  // 停止现有定时器
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  // 在 runSync 函数中添加状态跟踪
  const runSync = async () => {
    try {
      const intervalMinutes = await getIntervalFromSettings();
      logger.info(`按计划执行同步，间隔: ${intervalMinutes}分钟`);
      
      // 更新任务状态为运行中
      await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, 'running');
      
      await syncAllSubscriptions();
      
      // 重新设置定时器（如果间隔有变化）
      if (syncInterval) {
        clearInterval(syncInterval);
      }
      
      // 计算下次运行时间
      const nextRunTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
      syncInterval = setInterval(runSync, intervalMinutes * 60 * 1000);
      
      // 更新任务状态为成功，并设置下次运行时间
      await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, 'success', nextRunTime);
    } catch (error) {
      logger.error('计划同步任务失败', error);
      // 更新任务状态为失败
      await updateTaskStatus(
        TASK_NAMES.VIDEO_SYNC, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  };
  // 立即执行一次，然后设置定时器
  runSync();
  
  logger.info('同步服务已启动');
}

async function processVideo(video: Video) {
  try {
    // 处理视频逻辑
    await prisma.video.update({
      where: { id: video.id },
      data: {
        processed: true,
        translationStatus: 'pending' // 设置初始翻译状态
      }
    });
  } catch (error) {
    console.error(`Error processing video ${video.id}:`, error);
    await prisma.video.update({
      where: { id: video.id },
      data: {
        processed: false,
        translationStatus: 'failed',
        translationError: error.message
      }
    });
  }
}