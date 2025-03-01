import { prisma } from './prisma';
import { logger } from './logger';
import { TASK_NAMES } from './task-status-service';
import { getNextRunTimeForTask } from './task-util';

// 初始化任务状态
export async function initializeTaskStatus() {
  try {
    // 定义所有需要初始化的任务
    const taskNames = [
      TASK_NAMES.VIDEO_SYNC,
      TASK_NAMES.HEYGEN_EMAIL_CHECK,
      TASK_NAMES.MISSING_DATA_UPDATE
    ];

    // 为每个任务创建或更新状态记录
    for (const taskName of taskNames) {
      // 获取与cron配置一致的下一次执行时间
      const nextRunTime = await getNextRunTimeForTask(taskName);
      
      await prisma.taskStatus.upsert({
        where: { taskName },
        create: {
          taskName,
          status: 'idle',
          nextRunTime,
          runCount: 0
        },
        update: {} // 如果已存在，不更新任何字段
      });

      logger.debug(`初始化任务状态: ${taskName}, 下次执行时间: ${nextRunTime.toLocaleString()}`);
    }

    logger.debug('所有任务状态初始化完成');
    return true;
  } catch (error: unknown) {
    logger.error('初始化任务状态失败', error instanceof Error ? error.message : String(error));
    return false;
  }
}