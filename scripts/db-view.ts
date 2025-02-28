import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('正在查询数据库内容...\n');

  // 查询所有设置
  const settings = await prisma.setting.findMany();
  console.log('===== 系统设置 =====');
  settings.forEach(setting => {
    console.log(`${setting.id}: ${setting.value}`);
  });
  
  // 查询所有订阅
  const subscriptions = await prisma.subscription.findMany({
    include: {
      _count: {
        select: { videos: true }
      }
    }
  });
  
  console.log('\n===== 订阅列表 =====');
  subscriptions.forEach(sub => {
    console.log(`- ${sub.name} (${sub.type})`);
    console.log(`  ID: ${sub.id}`);
    console.log(`  源ID: ${sub.sourceId}`);
    console.log(`  缩略图: ${sub.thumbnailUrl || '无'}`);
    console.log(`  视频数量: ${sub._count.videos}`);
    console.log(`  最后同步: ${sub.lastSync.toLocaleString()}`);
    console.log('');
  });
  
  // 查询最新的10个视频
  const videos = await prisma.video.findMany({
    take: 10,
    orderBy: {
      publishedAt: 'desc'
    }
  });
  
  console.log('\n===== 最近10个视频 =====');
  videos.forEach(video => {
    console.log(`- ${video.title}`);
    console.log(`  ID: ${video.id}`);
    console.log(`  YouTube ID: ${video.youtubeId}`);
    console.log(`  发布时间: ${video.publishedAt.toLocaleString()}`);
    console.log(`  缩略图: ${video.thumbnailUrl || '无'}`);
    console.log(`  频道ID: ${video.channelId || '无'}`);
    console.log(`  频道名称: ${video.channelTitle || '无'}`);
    console.log('');
  });
  
  // 查询日志
  const logs = await prisma.log.findMany({
    take: 10,
    orderBy: {
      timestamp: 'desc'
    }
  });
  
  console.log('\n===== 最近10条日志 =====');
  logs.forEach(log => {
    console.log(`[${log.level.toUpperCase()}] ${log.timestamp.toLocaleString()}`);
    console.log(`  ${log.message}`);
    if (log.details) console.log(`  详情: ${log.details}`);
    if (log.source) console.log(`  来源: ${log.source}`);
    console.log('');
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