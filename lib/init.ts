import { startSyncService } from './sync-service';
import { logger } from './logger';
import { prisma } from './prisma';
import { initializeTaskStatus } from './task-init';

// 应用启动时执行的初始化
export async function initializeApp() {
  try {
    // 检查数据库连接
    await prisma.$connect();
    logger.info('数据库连接成功');
    
    console.log('initializeApp() 开始初始化应用');
    // 检查并创建默认设置
    await ensureDefaultSettings();
    
    console.log('initializeApp() 初始化任务状态');
    // 初始化任务状态
    await initializeTaskStatus();
    
    console.log('initializeApp() 启动同步服务');
    // 启动同步服务
    startSyncService();
    logger.info('应用初始化完成');
    
    return true;
  } catch (error) {
    logger.error('应用初始化失败', error);
    return false;
  }
}

// 确保默认设置存在
async function ensureDefaultSettings() {
  const requiredSettings = [
    { id: 'YOUTUBE_API_KEY', defaultValue: '' },
    { id: 'HEYGEN_EMAIL', defaultValue: '' },
    { id: 'HEYGEN_PASSWORD', defaultValue: '' },
    { id: 'SYNC_INTERVAL_MINUTES', defaultValue: '15' },
    { id: 'MAX_CONCURRENT_TRANSLATIONS', defaultValue: '2' }
  ];
  
  for (const setting of requiredSettings) {
    const exists = await prisma.setting.findUnique({
      where: { id: setting.id }
    });
    
    if (!exists) {
      await prisma.setting.create({
        data: {
          id: setting.id,
          value: setting.defaultValue
        }
      });
      logger.info(`创建默认设置: ${setting.id}`);
    }
  }
}