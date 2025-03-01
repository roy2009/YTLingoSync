import { startSyncService } from './sync-service';
import { logger } from './logger';
import { prisma } from './prisma';
import { initializeTaskStatus } from './task-init';
import { startHeyGenEmailCheckJob } from './heygen-cron-job';
import { startTransPendingVideoUpdateJob } from './update-trans-pending-video-job';

// 添加一个全局引用，避免定时任务被垃圾回收
const keepAliveReferences = {
  processInterval: null as NodeJS.Timeout | null,
};

// 应用启动时执行的初始化
export async function initializeApp() {
  try {
    // 检查数据库连接
    await prisma.$connect();
    logger.debug('数据库连接成功');
    
    logger.debug('initializeApp() 开始初始化应用');
    
    logger.debug('initializeApp() 初始化任务状态');
    // 初始化任务状态
    await initializeTaskStatus();
    
    logger.debug('initializeApp() 启动同步服务');
    // 启动同步服务
    startSyncService();
    
    logger.debug('initializeApp() 启动HeyGen邮件检查服务');
    // 启动HeyGen邮件检查服务
    const heygenJobStarted = await startHeyGenEmailCheckJob();
    if (heygenJobStarted) {
      logger.debug('HeyGen邮件检查服务启动成功');
    } else {
      logger.warn('HeyGen邮件检查服务启动失败，请检查日志了解详情');
    }
    
    logger.debug('initializeApp() 启动翻译排队视频服务');
    // 启动翻译排队视频服务
    const transPendingVideoJobStarted = await startTransPendingVideoUpdateJob();
    if (transPendingVideoJobStarted) {
      logger.debug('翻译排队视频服务启动成功');
    } else {
      logger.warn('翻译排队视频服务启动失败，请检查日志了解详情');
    }
    
    // 添加进程保活定时器，确保定时任务不会因为事件循环空闲而被终止
    keepAliveReferences.processInterval = setInterval(() => {
      logger.debug('进程保活心跳...');
    }, 60000); // 每分钟一次心跳
    
    logger.debug('应用初始化完成，所有定时任务已启动');
    
    return true;
  } catch (error) {
    // 类型错误修复
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('应用初始化失败', errorMessage);
    return false;
  }
}
