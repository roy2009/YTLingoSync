import { PrismaClient } from '@prisma/client';
import { getAllEnvSettings } from '../lib/env-service';

const prisma = new PrismaClient();

async function main() {
  logger.debug('正在查询数据库内容...\n');

  // 查询所有设置
  const settingsObj = await getAllEnvSettings();
  logger.debug('===== 系统设置 =====');
  Object.entries(settingsObj).forEach(([key, value]) => {
    logger.debug(`${key}: ${value}`);
  });
  
  // 查询所有订阅
  const subscriptions = await prisma.subscription.findMany({
    include: {
      _count: {
        select: { videos: true }
      }
    }
  });
  
  logger.debug('\n===== 订阅列表 =====');
  subscriptions.forEach(sub => {
    logger.debug(`- ${sub.name} (${sub.type})`);
    logger.debug(`  ID: ${sub.id}`);
    logger.debug(`  源ID: ${sub.sourceId}`);
    logger.debug(`  缩略图: ${sub.thumbnailUrl || '无'}`);
    logger.debug(`  视频数量: ${sub._count.videos}`);
    logger.debug(`  最后同步: ${sub.lastSync.toLocaleString()}`);
    logger.debug('');
  });
  
  // 查询最新的10个视频
  const videos = await prisma.video.findMany({
    take: 10,
    orderBy: {
      publishedAt: 'desc'
    }
  });
  
  logger.debug('\n===== 最近10个视频 =====');
  videos.forEach(video => {
    logger.debug(`- ${video.title}`);
    logger.debug(`  ID: ${video.id}`);
    logger.debug(`  YouTube ID: ${video.youtubeId}`);
    logger.debug(`  发布时间: ${video.publishedAt.toLocaleString()}`);
    logger.debug(`  缩略图: ${video.thumbnailUrl || '无'}`);
    logger.debug(`  频道ID: ${video.channelId || '无'}`);
    logger.debug(`  频道名称: ${video.channelTitle || '无'}`);
    logger.debug('');
  });
  
  // 查询日志
  const logs = await prisma.log.findMany({
    take: 10,
    orderBy: {
      timestamp: 'desc'
    }
  });
  
  logger.debug('\n===== 最近10条日志 =====');
  logs.forEach(log => {
    logger.debug(`[${log.level.toUpperCase()}] ${log.timestamp.toLocaleString()}`);
    logger.debug(`  ${log.message}`);
    if (log.details) logger.debug(`  详情: ${log.details}`);
    if (log.source) logger.debug(`  来源: ${log.source}`);
    logger.debug('');
  });
}

async function getVideoStatus() {
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      processed: true,
      translationStatus: true,
      translationError: true,
      translatedVideoUrl: true
    }
  });

  console.table(videos.map(v => ({
    ...v,
    hasTranslation: !!v.translatedVideoUrl
  })));
}

main()
  .catch(e => {
    console.error('查询数据库失败:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 