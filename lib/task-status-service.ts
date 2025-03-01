import { prisma } from './prisma';
import { logger } from './logger';
import { getNextRunTimeForTask } from './task-util';

// 定时任务名称常量
export const TASK_NAMES = {
  VIDEO_SYNC: 'VIDEO_SYNC_SERVICE',
  HEYGEN_EMAIL_CHECK: 'HEYGEN_EMAIL_CHECK',
  TRANS_PENDING_VIDEO: 'TRANS_PENDING_VIDEO'
};

// 任务状态更新参数类型
export type TaskStatusUpdateParams = {
  status?: 'running' | 'success' | 'failed' | 'idle';
  nextRun?: Date;
  lastRun?: Date;
  message?: string;
};

// 更新任务状态 - 旧版本函数，保留向后兼容性
export async function updateTaskStatus(
  taskName: string, 
  statusOrParams: 'running' | 'success' | 'failed' | 'idle' | TaskStatusUpdateParams,
  nextRunTime?: Date,
  errorMessage?: string
) {
  try {
    // 处理新旧两种调用方式
    let status: string;
    let nextRun: Date | undefined = nextRunTime;
    let message: string | undefined = errorMessage;
    let lastRun: Date | undefined;
    
    if (typeof statusOrParams === 'string') {
      // 旧版本调用方式
      status = statusOrParams;
      if (status === 'running') {
        lastRun = new Date();
      }
    } else {
      // 新版本调用方式，使用对象参数
      status = statusOrParams.status || 'idle';
      nextRun = statusOrParams.nextRun;
      message = statusOrParams.message;
      lastRun = statusOrParams.lastRun;
    }
    
    await prisma.taskStatus.upsert({
      where: { taskName },
      update: {
        status,
        lastRunTime: lastRun || (status === 'running' ? new Date() : undefined),
        nextRunTime: nextRun,
        errorMessage: message,
        runCount: status === 'success' || status === 'failed' 
          ? { increment: 1 } 
          : undefined,
        updatedAt: new Date()
      },
      create: {
        taskName,
        status,
        lastRunTime: lastRun || (status === 'running' ? new Date() : null),
        nextRunTime: nextRun,
        errorMessage: message,
        runCount: 0
      }
    });
    
    logger.debug(`更新任务状态: ${taskName}, 状态: ${status}`);
    return true;
  } catch (error: unknown) {
    logger.error(`更新任务状态失败: ${taskName}`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

// 根据cron配置更新任务状态（推荐使用此方法）
export async function updateTaskStatusWithCronTime(
  taskName: string,
  statusOrParams: 'running' | 'success' | 'failed' | 'idle' | TaskStatusUpdateParams
) {
  try {
    // 如果是对象参数并且已经指定了nextRun，则不需要计算
    if (typeof statusOrParams !== 'string' && statusOrParams.nextRun) {
      return await updateTaskStatus(taskName, statusOrParams);
    }
    
    // 从cron配置计算下一次运行时间
    const nextRunTime = await getNextRunTimeForTask(taskName);
    
    // 如果是对象参数，合并nextRun
    if (typeof statusOrParams !== 'string') {
      return await updateTaskStatus(taskName, {
        ...statusOrParams,
        nextRun: nextRunTime
      });
    } else {
      // 字符串参数，直接传递计算的nextRunTime
      return await updateTaskStatus(taskName, statusOrParams, nextRunTime);
    }
  } catch (error: unknown) {
    logger.error(`更新任务状态失败: ${taskName}`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

// 获取所有任务状态
export async function getAllTaskStatus() {
  try {
    const tasks = await prisma.taskStatus.findMany();
    return tasks;
  } catch (error: unknown) {
    logger.error('获取任务状态失败', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// 获取单个任务状态
export async function getTaskStatus(taskName: string) {
  try {
    const task = await prisma.taskStatus.findUnique({
      where: { taskName }
    });
    return task;
  } catch (error: unknown) {
    logger.error(`获取任务状态失败: ${taskName}`, error instanceof Error ? error.message : String(error));
    return null;
  }
}