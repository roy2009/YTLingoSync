import { prisma } from '@/lib/prisma';
import { fetchYouTubeData, parseDuration } from './youtube-api';
import { logger } from '@/lib/logger';
import { setupProxy } from '@/lib/proxy';
import { translateText, translateLongText } from './translate';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';
import { Video, Subscription } from '@prisma/client';
import * as nodeCron from 'node-cron';
import { getAllEnvSettings } from './env-service';

// 将 let syncInterval: NodeJS.Timeout | null = null; 替换为 cron 任务对象
let syncJob: nodeCron.ScheduledTask | null = null;
// 添加任务锁变量，防止任务重叠执行
let isSyncRunning = false;
// 添加默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 10 * 60 * 1000; // 10分钟



/**
 * 同步指定订阅的视频
 */
export async function syncSubscriptionImpl(subscription: Subscription, logs: string[] = [], options = { maxVideos: null as number | null }) {
  const { id: subscriptionId, type, sourceId, lastSync } = subscription;
  
  logger.debug(`开始同步订阅: ${subscription.name} (${subscriptionId})`);
  logs.push(`正在同步: ${subscription.name}`);
  
  try {
    // 获取自上次同步以来的视频
    const publishedAfter = lastSync ? new Date(lastSync) : undefined;
    logs.push(`获取${publishedAfter ? '自 ' + publishedAfter.toISOString() + ' 以来' : '所有'}的视频`);
    
    // 使用更新后的YouTube API获取视频
    const newVideos = await fetchYouTubeData({
      type: type as 'channel' | 'playlist',
      sourceId,
      maxResults: 30,  // 每次同步最多获取30个视频
      publishedAfter
    });
    
    logs.push(`从YouTube获取了 ${newVideos.length} 个视频`);
    
    if (newVideos.length === 0) {
      logs.push('没有新的视频需要同步');
      return { syncedCount: 0 };
    }
    
    // 获取已存在的视频ID，避免重复添加
    const existingVideoIds = (await prisma.video.findMany({
      where: {
        youtubeId: {
          in: newVideos.map((v: any) => v.youtubeId)
        }
      },
      select: { youtubeId: true }
    })).map(v => v.youtubeId);
    
    // 过滤出尚未添加的视频
    let videosToAdd = newVideos.filter((v: any) => !existingVideoIds.includes(v.youtubeId));
    logs.push(`过滤后有 ${videosToAdd.length} 个新视频需要添加`);
    
    if (videosToAdd.length === 0) {
      logs.push('所有视频已在数据库中');
      return { syncedCount: 0 };
    }
    
    // 如果传入了maxVideos选项，限制处理的视频数量（用于测试）
    if (options.maxVideos && videosToAdd.length > options.maxVideos) {
      logger.debug(`测试模式: 限制处理 ${options.maxVideos} 个视频`);
      videosToAdd = videosToAdd.slice(0, options.maxVideos);
    }
    
    // 获取翻译服务设置
    const settingsObj = await getAllEnvSettings();
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    
    // 准备要添加的视频数据
    const videosToCreate = await Promise.all(videosToAdd.map(async (video: any) => {
      // 初始化中文标题和描述
      let titleZh = null;
      let descriptionZh = null;
      // 解析视频时长（秒）
      const durationInSeconds = video.duration;
      // 转换为分钟
      const durationInMinutes = durationInSeconds / 60;
      
      //logger.debug('video.duration: ', video.duration, durationInMinutes);

      // 只有当翻译服务不是'none'时才执行翻译
      if (translationService !== 'none') {
        try {
          // 翻译标题
          logger.debug(`开始翻译视频标题: ${video.title.substring(0, 30)}...`);
          titleZh = await translateText(video.title);
          
          // 翻译失败时使用原标题
          if (!titleZh) {
            logger.warn(`标题翻译失败，使用原标题: ${video.title}`);
            titleZh = video.title;
          }
          
          // 只有当描述不为空时才翻译描述
          if (video.description) {
            logger.debug(`开始翻译视频描述...`);
            try {
              descriptionZh = await translateLongText(video.description);
              
              // 翻译失败时使用原描述
              if (!descriptionZh) {
                logger.warn('描述翻译失败，使用原描述');
                descriptionZh = video.description;
              }
            } catch (descError) {
              logger.error('翻译描述失败:', descError instanceof Error ? descError : String(descError));
              descriptionZh = video.description;
            }
          }
          
          // 记录翻译结果
          logger.debug(`标题翻译结果: "${titleZh ? titleZh.substring(0, 30) : 'null'}..."`);
        } catch (error) {
          logger.error(`翻译失败:`, error instanceof Error ? error : String(error));
          // 翻译失败时使用原文
          titleZh = video.title;
          descriptionZh = video.description;
        }
      } else {
        logger.debug('翻译服务未启用，跳过翻译');
      }
      
      let shouldTranslate = false;

      // 检查是否符合自动翻译条件
      shouldTranslate = 
        subscription.autoTranslate && 
        durationInMinutes > 0 && 
        (!subscription.maxDurationForTranslation || 
         durationInMinutes < subscription.maxDurationForTranslation);

      logger.debug('设置状态', shouldTranslate, durationInMinutes , subscription.autoTranslate, subscription.maxDurationForTranslation);

      // 设置翻译状态
      const translationStatus = shouldTranslate ? 'pending' : 'none';

      return {
        ...video,
        titleZh, 
        descriptionZh,
        subscriptionId,
        translationStatus
      };
    }));
    
    logs.push(`已翻译 ${videosToCreate.length} 个视频标题和描述`);
    
    // 在创建视频后添加翻译状态日志
    const translatedCount = videosToCreate.filter(v => v.titleZh !== null).length;
    logs.push(`${translatedCount}/${videosToCreate.length} 个视频标题已翻译`);

    const translatedDescCount = videosToCreate.filter(v => v.descriptionZh !== null).length;
    logs.push(`${translatedDescCount}/${videosToCreate.length} 个视频描述已翻译`);
    
    // 批量创建视频
    try {
      await prisma.video.createMany({
        data: videosToCreate
      });
      logger.debug(`同步完成: ${subscription.name}, 添加了 ${videosToCreate.length} 个视频`);
      logs.push(`成功添加了 ${videosToCreate.length} 个视频到数据库`);
    } catch (error) {
      // 处理唯一约束错误
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        logger.warn(`创建视频时发生唯一约束冲突，将尝试逐个创建`);
        logs.push(`创建视频时发生重复记录冲突，尝试逐个添加非重复视频`);
        
        // 逐个创建视频，忽略重复项
        let successCount = 0;
        for (const video of videosToCreate) {
          try {
            // 再次检查视频是否已存在
            const exists = await prisma.video.findUnique({
              where: { youtubeId: video.youtubeId },
              select: { id: true }
            });
            
            if (!exists) {
              await prisma.video.create({ data: video });
              successCount++;
            }
          } catch (innerError) {
            logger.warn(`跳过添加视频 ${video.youtubeId}: ${innerError instanceof Error ? innerError.message : String(innerError)}`);
          }
        }
        
        logger.debug(`同步完成: ${subscription.name}, 成功添加了 ${successCount}/${videosToCreate.length} 个视频`);
        logs.push(`通过逐个添加的方式成功添加了 ${successCount}/${videosToCreate.length} 个视频到数据库`);
        return { syncedCount: successCount };
      } else {
        // 其他错误，继续抛出
        throw error;
      }
    }
    
    return {
      syncedCount: videosToCreate.length
    };
    
  } catch (error) {
    logger.error(`同步订阅失败: ${subscriptionId}`, error instanceof Error ? error : String(error));
    logs.push(`同步失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 同步指定订阅的视频 - 统一的同步函数
 * 
 * @param subscriptionIdOrObject - 订阅ID或订阅对象
 * @param logs - 可选的日志数组，用于记录同步过程
 * @param options - 同步选项
 * @returns 同步结果
 */
export async function syncSubscription(
  subscriptionIdOrObject: string | Subscription,
  logs: string[] = [], 
  options = { maxVideos: null as number | null }
) {
  try {
    // 处理不同的输入参数类型
    let subscription: Subscription;
    
    if (typeof subscriptionIdOrObject === 'string') {
      // 如果传入的是ID，则查询订阅信息
      const subscriptionId = subscriptionIdOrObject;
      const foundSubscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });
      
      if (!foundSubscription) {
        const errorMsg = `订阅 ID ${subscriptionId} 不存在`;
        logger.error(errorMsg);
        logs.push(errorMsg);
        throw new Error(errorMsg);
      }
      
      subscription = foundSubscription;
    } else {
      // 如果传入的是订阅对象，直接使用
      subscription = subscriptionIdOrObject;
    }

    // 修复：添加await并返回结果
    const result = await syncSubscriptionImpl(subscription, logs, options);
    return result;
    
  } catch (error) {
    logger.error(`同步订阅失败: ${subscriptionIdOrObject}`, error instanceof Error ? error : String(error));
    logs.push(`同步失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
    
/*
    const { id: subscriptionId, type, sourceId, name } = subscription;
    
    logger.debug(`开始同步订阅: ${name} (${subscriptionId})`, { type });
    logs.push(`正在同步: ${name}`);
    
    // 获取现有视频的YouTube ID列表，用于去重
    const existingVideos = await prisma.video.findMany({
      where: { subscriptionId },
      select: { youtubeId: true }
    });
    
    const existingIds = new Set(existingVideos.map(v => v.youtubeId));
    
    // 确定是否为首次同步（检查是否有关联的视频）
    const isFirstSync = existingVideos.length === 0;
    
    // 首次同步只获取3条，后续同步获取更多
    const maxResults = isFirstSync ? 3 : 30;
    
    // 获取上次同步时间，如果有的话
    const publishedAfter = isFirstSync 
      ? undefined 
      : new Date(subscription.lastSync);
    
    logger.debug(`同步策略: ${isFirstSync ? '首次同步，获取最新3条' : '增量同步'}`);
    logs.push(`获取${publishedAfter ? '自 ' + publishedAfter.toISOString() + ' 以来' : '所有'}的视频`);
    
    // 获取视频数据
    const videoData = await fetchYouTubeData({
      type: type as 'channel' | 'playlist',
      sourceId,
      maxResults,
      publishedAfter
    });
    
    logs.push(`从YouTube获取了 ${videoData.length} 个视频`);
    
    // 过滤掉已存在的视频
    let newVideos = videoData.filter((video: any) => !existingIds.has(video.youtubeId));
    
    if (newVideos.length === 0) {
      logger.debug(`订阅 ${name} 没有新视频`);
      logs.push('没有新的视频需要同步');
      
      // 即使没有新视频，也更新同步时间
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { lastSync: new Date() }
      });
      
      return { syncedCount: 0, added: 0 };
    }
    
    logs.push(`过滤后有 ${newVideos.length} 个新视频需要添加`);
    
    // 如果传入了maxVideos选项，限制处理的视频数量（用于测试）
    if (options.maxVideos && newVideos.length > options.maxVideos) {
      logger.debug(`测试模式: 限制处理 ${options.maxVideos} 个视频`);
      newVideos = newVideos.slice(0, options.maxVideos);
    }
    
    // 获取翻译服务设置
    const settingsObj = await getAllEnvSettings();
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    
    // 准备要添加的视频数据
    const videosToCreate = await Promise.all(newVideos.map(async (video: any) => {
      // 解析视频时长（秒）
      const durationInSeconds = parseDuration(video.duration);
      // 转换为分钟
      const durationInMinutes = durationInSeconds / 60;
      
      // 初始化中文标题和描述
      let titleZh = null;
      let descriptionZh = null;
      
      // 检查是否符合自动翻译条件
      const shouldTranslate = 
        subscription.autoTranslate && 
        translationService !== 'none' && 
        durationInMinutes > 0 && 
        (!subscription.maxDurationForTranslation || 
         durationInMinutes < subscription.maxDurationForTranslation / 60);
      
      // 根据订阅设置和全局设置决定是否翻译
      if (shouldTranslate) {
        try {
          // 获取目标语言
          const targetLanguage = subscription.targetLanguage || 'Chinese';
          logger.debug(`使用目标语言: ${targetLanguage}`);
          
          // 翻译标题
          logger.debug(`开始翻译视频标题: ${video.title.substring(0, 30)}...`);
          titleZh = await translateText(video.title, targetLanguage);
          
          // 翻译失败时使用原标题
          if (!titleZh) {
            logger.warn(`标题翻译失败，使用原标题: ${video.title}`);
            titleZh = video.title;
          }
          
          // 只有当描述不为空时才翻译描述
          if (video.description) {
            logger.debug(`开始翻译视频描述...`);
            try {
              descriptionZh = await translateLongText(video.description, targetLanguage);
              
              // 翻译失败时使用原描述
              if (!descriptionZh) {
                logger.warn('描述翻译失败，使用原描述');
                descriptionZh = video.description;
              }
            } catch (descError) {
              logger.error('翻译描述失败:', descError instanceof Error ? descError : String(descError));
              descriptionZh = video.description;
            }
          }
          
          // 记录翻译结果
          logger.debug(`标题翻译结果: "${titleZh ? titleZh.substring(0, 30) : 'null'}..."`);
        } catch (error) {
          logger.error(`翻译失败:`, error instanceof Error ? error : String(error));
          // 翻译失败时使用原文
          titleZh = video.title;
          descriptionZh = video.description;
        }
      } else {
        if (!subscription.autoTranslate) {
          logger.debug(`订阅 ${name} 已禁用自动翻译，跳过翻译`);
        } else if (subscription.maxDurationForTranslation && durationInSeconds > subscription.maxDurationForTranslation) {
          logger.debug(`视频时长 ${durationInSeconds}秒 超过订阅设置的最大翻译时长 ${subscription.maxDurationForTranslation}秒，跳过翻译`);
        } else {
          logger.debug('翻译服务未启用，跳过翻译');
        }
      }
      
      // 设置翻译状态
      const translationStatus = shouldTranslate ? 'pending' : 'skipped';
      
      return {
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt,
        duration: video.duration,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        titleZh,
        descriptionZh,
        subscriptionId,
        translationStatus
      };
    }));
    
    if (videosToCreate.length > 0) {
      // 记录翻译结果
      const translatedCount = videosToCreate.filter(v => v.titleZh !== null).length;
      logs.push(`${translatedCount}/${videosToCreate.length} 个视频标题已翻译`);
      
      const translatedDescCount = videosToCreate.filter(v => v.descriptionZh !== null).length;
      logs.push(`${translatedDescCount}/${videosToCreate.length} 个视频描述已翻译`);
      
      // 批量创建视频
      await prisma.video.createMany({
        data: videosToCreate
      });
    }
    
    // 更新订阅的最后同步时间
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { lastSync: new Date() }
    });
    
    logger.debug(`同步完成: ${name}，添加了 ${videosToCreate.length} 个视频`);
    logs.push(`成功添加了 ${videosToCreate.length} 个视频到数据库`);
    
    return { 
      syncedCount: videosToCreate.length,
      added: videosToCreate.length 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`同步订阅失败:`, error);
    logs.push(`同步失败: ${errorMsg}`);
    throw error;
  }
    */

export async function syncAllSubscriptions() {
  try {
    logger.debug('开始同步所有订阅...');
    
    // 获取翻译服务设置
    const settingsObj = await getAllEnvSettings();
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    logger.debug(`使用翻译服务: ${translationService}`);
    
    // 获取所有订阅
    const subscriptions = await prisma.subscription.findMany();
    logger.debug(`找到 ${subscriptions.length} 个订阅`);
    
    // 同步每个订阅
    for (const subscription of subscriptions) {
      try {
        await syncSubscription(subscription);
      } catch (error) {
        logger.error(`同步订阅失败: ${subscription.id}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    logger.debug('所有订阅同步完成');
  } catch (error) {
    logger.error('同步服务出错:', { error: error instanceof Error ? error.message : String(error) });
  }
}

export function startSyncService() {
  // 读取设置
  const getIntervalFromSettings = async () => {
    try {
      const { getEnvSetting } = await import('./env-service');
      const intervalSetting = await getEnvSetting('SYNC_INTERVAL_MINUTES');
      return intervalSetting ? parseInt(intervalSetting) : 15; // 默认15分钟
    } catch (error) {
      logger.error('获取同步间隔设置失败', { error: error instanceof Error ? error.message : String(error) });
      return 15; // 默认值
    }
  };

  // 停止现有定时器
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
  }

  // 启动新的 Cron 任务
  const setupCronJob = async () => {
    try {
      const intervalMinutes = await getIntervalFromSettings();
      // 转换为 cron 表达式（每隔X分钟执行一次）
      const cronExpression = `*/${intervalMinutes} * * * *`;
      
      logger.debug(`设置同步服务定时任务，间隔: ${intervalMinutes}分钟，表达式: ${cronExpression}`);
      
      // 在 runSync 函数中添加状态跟踪、重叠防护和超时保护
      syncJob = nodeCron.schedule(cronExpression, async () => {
        // 检查任务是否已在运行，防止重叠执行
        if (isSyncRunning) {
          logger.warn('上一次同步任务尚未完成，跳过本次执行');
          return;
        }
        
        // 设置任务超时计时器
        let timeoutId: NodeJS.Timeout | null = null;
        
        try {
          // 标记任务开始运行
          isSyncRunning = true;
          
          // 设置任务超时保护
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('同步任务执行超时'));
            }, DEFAULT_TIMEOUT);
          });
          
          // 更新任务状态为运行中
          await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, {
            status: 'running',
            message: '正在执行视频同步'
          });
          
          // 执行同步任务，并添加超时保护
          await Promise.race([
            syncAllSubscriptions(),
            timeoutPromise
          ]);
          
          // 计算下次运行时间
          const nextRunTime = new Date();
          nextRunTime.setMinutes(nextRunTime.getMinutes() + intervalMinutes);
          
          // 清除超时计时器
          if (timeoutId) clearTimeout(timeoutId);
          
          // 更新任务状态为成功，并设置下次运行时间
          await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, {
            status: 'success',
            nextRun: nextRunTime,
            lastRun: new Date(),
            message: '同步完成'
          });
          
          logger.debug(`同步服务执行完成，下次执行时间: ${nextRunTime.toLocaleString()}`);
        } catch (error) {
          // 清除超时计时器
          if (timeoutId) clearTimeout(timeoutId);
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('计划同步任务失败', { error: errorMessage });
          
          // 更新任务状态为失败
          await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, {
            status: 'failed',
            lastRun: new Date(),
            message: errorMessage
          });
        } finally {
          // 无论成功还是失败，都标记任务已完成
          isSyncRunning = false;
        }
      });
      
      // 启动任务
      syncJob.start();
      
      // 获取下一次执行时间并记录
      const nextRunTime = new Date();
      nextRunTime.setMinutes(nextRunTime.getMinutes() + intervalMinutes);
      
      await updateTaskStatus(TASK_NAMES.VIDEO_SYNC, {
        status: 'idle',
        nextRun: nextRunTime,
        message: '等待下一次执行'
      });
      
      logger.debug(`同步服务已启动，下一次执行时间: ${nextRunTime.toLocaleString()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('启动定时同步任务失败', { error: errorMessage });
    }
  };
  
  // 立即设置并启动 Cron 任务
  setupCronJob();
}

export function stopSyncService() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    logger.debug('同步服务已停止');
    return true;
  }
  return false;
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
        translationError: error instanceof Error ? error.message : String(error)
      }
    });
  }
}