import { prisma } from './prisma';
import { logger } from './logger';

// 定时任务名称常量
export const TASK_NAMES = {
  VIDEO_SYNC: 'video_sync_service',
  HEYGEN_EMAIL_CHECK: 'heygen_email_check',
  MISSING_DATA_UPDATE: 'missing_data_update'
};

// 更新任务状态
export async function updateTaskStatus(
  taskName: string, 
  status: 'running' | 'success' | 'failed' | 'idle',
  nextRunTime?: Date,
  errorMessage?: string
) {
  try {
    await prisma.taskStatus.upsert({
      where: { taskName },
      update: {
        status,
        lastRunTime: status === 'running' ? new Date() : undefined,
        nextRunTime,
        errorMessage,
        runCount: status === 'success' || status === 'failed' 
          ? { increment: 1 } 
          : undefined,
        updatedAt: new Date()
      },
      create: {
        taskName,
        status,
        lastRunTime: status === 'running' ? new Date() : null,
        nextRunTime,
        errorMessage,
        runCount: 0
      }
    });
    
    logger.debug(`更新任务状态: ${taskName}, 状态: ${status}`);
    return true;
  } catch (error) {
    logger.error(`更新任务状态失败: ${taskName}`, error);
    return false;
  }
}

// 获取所有任务状态
export async function getAllTaskStatus() {
  try {
    return await prisma.taskStatus.findMany({
      orderBy: { updatedAt: 'desc' }
    });
  } catch (error) {
    logger.error('获取任务状态失败', error);
    return [];
  }
}

// 获取单个任务状态
export async function getTaskStatus(taskName: string) {
  try {
    return await prisma.taskStatus.findUnique({
      where: { taskName }
    });
  } catch (error) {
    logger.error(`获取任务状态失败: ${taskName}`, error);
    return null;
  }
}