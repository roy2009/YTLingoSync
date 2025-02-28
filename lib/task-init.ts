import { prisma } from './prisma';
import { logger } from './logger';
import { TASK_NAMES } from './task-status-service';

// 初始化任务状态
export async function initializeTaskStatus() {
  try {
    // 定义所有需要初始化的任务
    const tasks = [
      {
        taskName: TASK_NAMES.VIDEO_SYNC,
        status: 'idle',
        nextRunTime: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后
      },
      {
        taskName: TASK_NAMES.HEYGEN_EMAIL_CHECK,
        status: 'idle',
        nextRunTime: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后
      },
      {
        taskName: TASK_NAMES.MISSING_DATA_UPDATE,
        status: 'idle',
        nextRunTime: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后
      }
    ];

    // 为每个任务创建或更新状态记录
    for (const task of tasks) {
      await prisma.taskStatus.upsert({
        where: { taskName: task.taskName },
        create: {
          taskName: task.taskName,
          status: task.status,
          nextRunTime: task.nextRunTime,
          runCount: 0
        },
        update: {} // 如果已存在，不更新任何字段
      });

      logger.info(`初始化任务状态: ${task.taskName}`);
    }

    logger.info('所有任务状态初始化完成');
    return true;
  } catch (error) {
    logger.error('初始化任务状态失败', error);
    return false;
  }
}