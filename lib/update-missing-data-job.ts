import { prisma } from './prisma';
import { logger } from './logger';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';
import * as nodeCron from 'node-cron';
import { updateMissingVideoData } from './update-missing-data';
import { getAllEnvSettings } from './env-service';

let missingDataJob: nodeCron.ScheduledTask | null = null;
// 添加任务锁变量，防止任务重叠执行
let isMissingDataRunning = false;
// 添加默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 50 * 60 * 1000; // 50分钟

// 获取下一次执行时间
function getNextExecutionTime(): Date {
  // 默认为15分钟后
  return new Date(Date.now() + 15 * 60 * 1000);
}

// 启动缺失数据更新任务
export async function startMissingDataUpdateJob() {
  try {
    // 停止现有任务（如果有）
    if (missingDataJob) {
      missingDataJob.stop();
    }
    
    // 获取环境设置
    const settingsObj = await getAllEnvSettings();
    
    // 检查是否启用了缺失数据更新
    const enabled = settingsObj.MISSING_DATA_UPDATE_ENABLED !== 'false'; // 默认启用
    if (!enabled) {
      logger.debug('缺失数据更新已禁用，不启动任务');
      return false;
    }
    
    // 获取检查间隔（默认每小时）
    const checkInterval = settingsObj.MISSING_DATA_UPDATE_INTERVAL || '0 * * * *';
    
    // 创建 Cron 任务
    missingDataJob = nodeCron.schedule(checkInterval, async () => {
      // 检查任务是否已在运行，防止重叠执行
      if (isMissingDataRunning) {
        logger.warn('上一次缺失数据更新任务尚未完成，跳过本次执行');
        return;
      }
      
      // 设置任务超时计时器
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // 标记任务开始运行
        isMissingDataRunning = true;
        
        // 设置任务超时保护
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('缺失数据更新任务执行超时'));
          }, DEFAULT_TIMEOUT);
        });
        
        logger.debug('执行定期缺失数据更新');
        
        // 更新任务状态为运行中
        await updateTaskStatus(TASK_NAMES.MISSING_DATA_UPDATE, {
          status: 'running',
          message: '正在更新缺失数据'
        });
        
        // 执行缺失数据更新，添加超时保护
        const result = await Promise.race([
          updateMissingVideoData(),
          timeoutPromise
        ]) as { updated?: number } | undefined;
        
        // 清除超时计时器
        if (timeoutId) clearTimeout(timeoutId);
        
        const updatedCount = result?.updated || 0;
        
        // 计算下次运行时间
        const nextRunTime = getNextExecutionTime();
        
        // 更新任务状态为成功
        await updateTaskStatus(TASK_NAMES.MISSING_DATA_UPDATE, {
          lastRun: new Date(),
          nextRun: nextRunTime,
          status: 'idle',
          message: `已更新 ${updatedCount} 条缺失数据`
        });
        
        logger.debug(`缺失数据更新完成: 更新了 ${updatedCount} 条数据`);
      } catch (error: unknown) {
        // 清除超时计时器
        if (timeoutId) clearTimeout(timeoutId);
        
        // 记录错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('执行缺失数据更新失败:', errorMessage);
        
        // 更新任务状态为失败
        await updateTaskStatus(
          TASK_NAMES.MISSING_DATA_UPDATE, 
          {
            status: 'failed',
            lastRun: new Date(),
            nextRun: getNextExecutionTime(),
            message: errorMessage
          }
        );
      } finally {
        // 无论成功还是失败，都标记任务已完成
        isMissingDataRunning = false;
      }
    });
    
    // 更新任务状态为空闲
    await updateTaskStatus(
      TASK_NAMES.MISSING_DATA_UPDATE, 
      {
        status: 'idle',
        message: '等待下一次执行',
        nextRun: getNextExecutionTime()
      }
    );
    
    // 启动任务
    missingDataJob.start();
    
    // 记录下一次执行时间
    logger.debug(`缺失数据更新任务已启动，下一次执行时间: ${
      new Date(getNextExecutionTime()).toLocaleString()
    }`);
    
    return true;
  } catch (error: unknown) {
    logger.error('启动缺失数据更新任务失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function stopMissingDataUpdateJob() {
  if (missingDataJob) {
    missingDataJob.stop();
    missingDataJob = null;
    logger.debug('缺失数据更新任务已停止');
    return true;
  }
  return false;
} 