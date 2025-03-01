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
import { getAllEnvSettings } from './env-service';
import { syncSubscription } from './sync-service';

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
    
    logger.debug(`处理视频分段 - ${video.title}, 时长: ${duration}秒, 分段数: ${segmentCount}`);
    
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
    logger.debug(`下载视频 ${youtubeId}`);
    
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
    logger.debug(`分割视频 ${fileName}, 时间段: ${startTime}-${endTime}秒`);
    
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
      logger.debug(`删除临时文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`删除临时文件 ${filePath} 失败:`, error);
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