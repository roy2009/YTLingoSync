import { prisma } from './prisma';
import { logger } from './logger';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';
import * as nodeCron from 'node-cron';
import { updatePendingVideoData } from './update-trans-pending-video';
import { getAllEnvSettings } from './env-service';

let transPendingVideoJob: nodeCron.ScheduledTask | null = null;
// 添加任务锁变量，防止任务重叠执行
let isTransPendingVideoRunning = false;
// 添加默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 50 * 60 * 1000; // 50分钟

// 获取下一次执行时间
function getNextExecutionTime(): Date {
  // 默认为15分钟后
  return new Date(Date.now() + 15 * 60 * 1000);
}

// 启动翻译排队视频任务
export async function startTransPendingVideoUpdateJob() {
  try {
    // 停止现有任务（如果有）
    if (transPendingVideoJob) {
      transPendingVideoJob.stop();
    }
    
    // 获取环境设置
    const settingsObj = await getAllEnvSettings();
    
    // 检查是否启用了翻译排队视频
    const enabled = settingsObj.MISSING_DATA_UPDATE_ENABLED !== 'false'; // 默认启用
    if (!enabled) {
      logger.debug('翻译排队视频已禁用，不启动任务');
      return false;
    }
    
    // 获取检查间隔（默认每小时）
    const checkInterval = settingsObj.MISSING_DATA_UPDATE_INTERVAL || '0 * * * *';
    
    // 创建 Cron 任务
    transPendingVideoJob = nodeCron.schedule(checkInterval, async () => {
      // 检查任务是否已在运行，防止重叠执行
      if (isTransPendingVideoRunning) {
        logger.warn('上一次翻译排队视频任务尚未完成，跳过本次执行');
        return;
      }
      
      // 设置任务超时计时器
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // 标记任务开始运行
        isTransPendingVideoRunning = true;
        
        // 设置任务超时保护
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('翻译排队视频任务执行超时'));
          }, DEFAULT_TIMEOUT);
        });
        
        logger.debug('执行定期翻译排队视频');
        
        // 更新任务状态为运行中
        await updateTaskStatus(TASK_NAMES.TRANS_PENDING_VIDEO, {
          status: 'running',
          message: '正在翻译排队视频'
        });
        
        // 执行翻译排队视频，添加超时保护
        const result = await Promise.race([
          updatePendingVideoData(),
          timeoutPromise
        ]) as { updated?: number } | undefined;
        
        // 清除超时计时器
        if (timeoutId) clearTimeout(timeoutId);
        
        const updatedCount = result?.updated || 0;
        
        // 计算下次运行时间
        const nextRunTime = getNextExecutionTime();
        
        // 更新任务状态为成功
        await updateTaskStatus(TASK_NAMES.TRANS_PENDING_VIDEO, {
          lastRun: new Date(),
          nextRun: nextRunTime,
          status: 'idle',
          message: `已翻译 ${updatedCount} 条翻译排队`
        });
        
        logger.debug(`翻译排队视频完成: 更新了 ${updatedCount} 条数据`);
      } catch (error: unknown) {
        // 清除超时计时器
        if (timeoutId) clearTimeout(timeoutId);
        
        // 记录错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('执行翻译排队视频失败:', errorMessage);
        
        // 更新任务状态为失败
        await updateTaskStatus(
          TASK_NAMES.TRANS_PENDING_VIDEO, 
          {
            status: 'failed',
            lastRun: new Date(),
            nextRun: getNextExecutionTime(),
            message: errorMessage
          }
        );
      } finally {
        // 无论成功还是失败，都标记任务已完成
        isTransPendingVideoRunning = false;
      }
    });
    
    // 更新任务状态为空闲
    await updateTaskStatus(
      TASK_NAMES.TRANS_PENDING_VIDEO, 
      {
        status: 'idle',
        message: '等待下一次执行',
        nextRun: getNextExecutionTime()
      }
    );
    
    // 启动任务
    transPendingVideoJob.start();
    
    // 记录下一次执行时间
    logger.debug(`翻译排队视频任务已启动，下一次执行时间: ${
      new Date(getNextExecutionTime()).toLocaleString()
    }`);
    
    return true;
  } catch (error: unknown) {
    logger.error('启动翻译排队视频任务失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function stopTransPendingVideoUpdateJob() {
  if (transPendingVideoJob) {
    transPendingVideoJob.stop();
    transPendingVideoJob = null;
    logger.debug('翻译排队视频任务已停止');
    return true;
  }
  return false;
} 