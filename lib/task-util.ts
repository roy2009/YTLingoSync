import { logger } from './logger';
import * as nodeCron from 'node-cron';
import { getAllEnvSettings } from './env-service';
import { TASK_NAMES } from './task-status-service';

// 根据cron表达式计算下一次执行时间
export function getNextRunTimeFromCron(cronExpression: string, defaultMinutes: number): Date {
  // 如果cron表达式无效，使用默认分钟数
  if (!nodeCron.validate(cronExpression)) {
    logger.warn(`无效的cron表达式: ${cronExpression}，使用默认值: ${defaultMinutes}分钟后`);
    return new Date(Date.now() + defaultMinutes * 60 * 1000);
  }

  try {
    // 解析cron表达式
    const parts = cronExpression.split(' ');
    
    // 处理常见的形式，例如 */5 * * * *（每5分钟）
    if (parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].substring(2));
      if (!isNaN(minutes)) {
        return new Date(Date.now() + minutes * 60 * 1000);
      }
    }
    
    // 更复杂的cron表达式处理...
    return new Date(Date.now() + defaultMinutes * 60 * 1000);
  } catch (error) {
    logger.warn(`解析cron表达式失败: ${cronExpression}，使用默认值: ${defaultMinutes}分钟后`, 
      error instanceof Error ? error.message : String(error));
    return new Date(Date.now() + defaultMinutes * 60 * 1000);
  }
}

// 获取特定任务的下一次执行时间
export async function getNextRunTimeForTask(taskName: string): Promise<Date> {
  const settings = await getAllEnvSettings();
  
  // 根据任务名称获取对应的cron配置
  switch (taskName) {
    case TASK_NAMES.VIDEO_SYNC:
      const syncInterval = settings.SYNC_INTERVAL_MINUTES 
        ? `*/${settings.SYNC_INTERVAL_MINUTES} * * * *` 
        : '*/5 * * * *';
      return getNextRunTimeFromCron(syncInterval, 5);
      
    case TASK_NAMES.HEYGEN_EMAIL_CHECK:
      const heygenInterval = settings.HEYGEN_EMAIL_CHECK_INTERVAL || '*/5 * * * *';
      return getNextRunTimeFromCron(heygenInterval, 5);
      
    case TASK_NAMES.MISSING_DATA_UPDATE:
      const missingDataInterval = settings.MISSING_DATA_UPDATE_INTERVAL || '0 * * * *';
      return getNextRunTimeFromCron(missingDataInterval, 15);
      
    default:
      // 未知任务类型，使用默认15分钟
      logger.warn(`未知任务类型: ${taskName}，使用默认15分钟后执行`);
      return new Date(Date.now() + 15 * 60 * 1000);
  }
} 