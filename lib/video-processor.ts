import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from './prisma';
import { queueTranslation } from './translation-queue';
import { setupProxy } from './proxy';
import { Subscription } from '@prisma/client';
import { logger } from './logger';
import { fetchYouTubeData } from './youtube-api';
import { translateText, translateLongText } from './translate';

const execAsync = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'temp');
const SEGMENT_LENGTH = 1800; // 30分钟（秒）

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function processVideoForTranslation(videoId: string) {
  try {
    const video = await prisma.video.findUnique({
      where: { youtubeId: videoId },
      include: { subscription: true }
    });
    
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }
    
    // 计算需要分成几段
    const duration = video.duration || 0;
    const segmentCount = Math.ceil(duration / SEGMENT_LENGTH);
    
    console.log(`处理视频分段 - ${video.title}, 时长: ${duration}秒, 分段数: ${segmentCount}`);
    
    // 为每个分段创建翻译任务
    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * SEGMENT_LENGTH;
      const endTime = Math.min((i + 1) * SEGMENT_LENGTH, duration);
      
      const translation = await prisma.translation.create({
        data: {
          videoId: video.id,
          status: 'pending',
          partIndex: i,
          totalParts: segmentCount,
          startTime,
          endTime
        }
      });
      
      // 将分段翻译任务加入队列
      queueTranslation(translation.id);
    }
    
    // 标记视频为已处理
    await prisma.video.update({
      where: { id: video.id },
      data: { processed: true }
    });
    
    return true;
  } catch (error) {
    console.error(`处理视频 ${videoId} 失败:`, error);
    throw error;
  }
}

// 下载YouTube视频（用于极少数情况下需要本地处理的情况）
export async function downloadYouTubeVideo(youtubeId: string): Promise<string> {
  const outputPath = path.join(TEMP_DIR, `${youtubeId}.mp4`);
  
  try {
    console.log(`下载视频 ${youtubeId}`);
    
    // 使用yt-dlp下载视频
    await execAsync(`yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4' -o "${outputPath}" https://www.youtube.com/watch?v=${youtubeId}`);
    
    return outputPath;
  } catch (error) {
    console.error(`下载视频 ${youtubeId} 失败:`, error);
    throw error;
  }
}

// 分割视频为指定时间段
export async function splitVideo(inputPath: string, startTime: number, endTime: number): Promise<string> {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(TEMP_DIR, `${fileName}_${startTime}-${endTime}.mp4`);
  
  try {
    console.log(`分割视频 ${fileName}, 时间段: ${startTime}-${endTime}秒`);
    
    // 使用ffmpeg分割视频
    await execAsync(`ffmpeg -i "${inputPath}" -ss ${startTime} -to ${endTime} -c copy "${outputPath}"`);
    
    return outputPath;
  } catch (error) {
    console.error(`分割视频失败:`, error);
    throw error;
  }
}

// 清理临时文件
export function cleanupTempFiles(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`删除临时文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`删除临时文件 ${filePath} 失败:`, error);
  }
}

/**
 * 同步指定订阅的视频
 */
export async function syncSubscription(subscription: Subscription, logs: string[] = [], options = { maxVideos: null }) {
  const { id: subscriptionId, type, sourceId, lastSync, youtubeChannelId } = subscription;
  
  logger.info(`开始同步订阅: ${subscription.name} (${subscriptionId})`);
  logs.push(`正在同步: ${subscription.name}`);
  
  try {
    // 获取自上次同步以来的视频
    const publishedAfter = lastSync ? new Date(lastSync) : undefined;
    logs.push(`获取${publishedAfter ? '自 ' + publishedAfter.toISOString() + ' 以来' : '所有'}的视频`);
    
    // 使用更新后的YouTube API获取视频
    const newVideos = await fetchYouTubeData({
      type,
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
        subscriptionId,
        youtubeId: {
          in: newVideos.map(v => v.youtubeId)
        }
      },
      select: { youtubeId: true }
    })).map(v => v.youtubeId);
    
    // 过滤出尚未添加的视频
    const videosToAdd = newVideos.filter(v => !existingVideoIds.includes(v.youtubeId));
    logs.push(`过滤后有 ${videosToAdd.length} 个新视频需要添加`);
    
    if (videosToAdd.length === 0) {
      logs.push('所有视频已在数据库中');
      return { syncedCount: 0 };
    }
    
    // 如果传入了maxVideos选项，限制处理的视频数量（用于测试）
    if (options.maxVideos && videosToAdd.length > options.maxVideos) {
      logger.info(`测试模式: 限制处理 ${options.maxVideos} 个视频`);
      videosToAdd = videosToAdd.slice(0, options.maxVideos);
    }
    
    // 准备要添加的视频数据
    const videosToCreate = await Promise.all(videosToAdd.map(async (video) => {
      // 获取翻译服务设置
      const settings = await prisma.setting.findMany();
      const settingsObj = settings.reduce((acc, item) => {
        acc[item.id] = item.value;
        return acc;
      }, {});
      
      // 检查翻译服务是否启用
      const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
      
      // 初始化中文标题和描述
      let titleZh = null;
      let descriptionZh = null;
      
      // 只有当翻译服务不是'none'时才执行翻译
      if (translationService !== 'none') {
        try {
          // 翻译标题
          logger.info(`开始翻译视频标题: ${video.title.substring(0, 30)}...`);
          titleZh = await translateText(video.title);
          
          // 翻译失败时使用原标题
          if (!titleZh) {
            logger.warn(`标题翻译失败，使用原标题: ${video.title}`);
            titleZh = video.title;
          }
          
          // 只有当描述不为空时才翻译描述
          if (video.description) {
            logger.info(`开始翻译视频描述...`);
            try {
              descriptionZh = await translateLongText(video.description);
              
              // 翻译失败时使用原描述
              if (!descriptionZh) {
                logger.warn('描述翻译失败，使用原描述');
                descriptionZh = video.description;
              }
            } catch (descError) {
              logger.error('翻译描述失败:', descError);
              descriptionZh = video.description;
            }
          }
          
          // 记录翻译结果
          logger.info(`标题翻译结果: "${titleZh ? titleZh.substring(0, 30) : 'null'}..."`);
        } catch (error) {
          logger.error(`翻译失败:`, error);
          // 翻译失败时使用原文
          titleZh = video.title;
          descriptionZh = video.description;
        }
      } else {
        logger.info('翻译服务未启用，跳过翻译');
      }
      
      return {
        ...video,
        titleZh, 
        descriptionZh,
        subscriptionId
      };
    }));
    
    logs.push(`已翻译 ${videosToCreate.length} 个视频标题和描述`);
    
    // 在创建视频后添加翻译状态日志
    const translatedCount = videosToCreate.filter(v => v.titleZh !== null).length;
    logs.push(`${translatedCount}/${videosToCreate.length} 个视频标题已翻译`);

    const translatedDescCount = videosToCreate.filter(v => v.descriptionZh !== null).length;
    logs.push(`${translatedDescCount}/${videosToCreate.length} 个视频描述已翻译`);
    
    // 批量创建视频
    await prisma.video.createMany({
      data: videosToCreate
    });
    
    logger.info(`同步完成: ${subscription.name}, 添加了 ${videosToCreate.length} 个视频`);
    logs.push(`成功添加了 ${videosToCreate.length} 个视频到数据库`);
    
    return {
      syncedCount: videosToCreate.length
    };
    
  } catch (error) {
    logger.error(`同步订阅失败: ${subscriptionId}`, error);
    logs.push(`同步失败: ${error.message}`);
    throw error;
  }
}

async function checkVideoExists(youtubeId: string) {
  const video = await prisma.video.findUnique({
    where: { youtubeId }
  });
  return !!video;
}

async function getVideoDetails(youtubeId: string) {
  return prisma.video.findUnique({
    where: { youtubeId },
    include: {
      subscription: true
    }
  });
} 