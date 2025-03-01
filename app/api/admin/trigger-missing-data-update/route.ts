import { NextResponse } from 'next/server';
import { updateMissingVideoData } from '@/lib/update-missing-data';
import { updateTaskStatus, TASK_NAMES } from '@/lib/task-status-service';
import { logger } from '@/lib/logger';

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5分钟

// 记录任务执行状态的变量
let isRunning = false;

export async function POST() {
  try {
    // 检查任务是否已在运行，防止重复执行
    if (isRunning) {
      logger.warn('手动触发的缺失数据更新任务已在运行中，请等待完成');
      return NextResponse.json(
        { success: false, message: '任务已在运行中，请稍后再试' },
        { status: 409 }
      );
    }
    
    // 设置任务超时计时器
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // 标记任务开始运行
      isRunning = true;
      
      logger.debug('手动触发缺失数据更新任务开始执行');
      
      // 更新任务状态为运行中
      await updateTaskStatus(TASK_NAMES.MISSING_DATA_UPDATE, {
        status: 'running',
        message: '正在更新缺失数据 (手动触发)'
      });
      
      // 设置任务超时保护
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('缺失数据更新任务执行超时'));
        }, DEFAULT_TIMEOUT);
      });
      
      // 执行缺失数据更新，添加超时保护
      const result = await Promise.race([
        updateMissingVideoData(),
        timeoutPromise
      ]) as { updated?: number } | undefined;
      
      // 清除超时计时器
      if (timeoutId) clearTimeout(timeoutId);
      
      const updatedCount = result?.updated || 0;
      
      // 计算下次自动运行时间（使用定时任务的时间）
      const nextRunTime = new Date(Date.now() + 15 * 60 * 1000);
      
      // 更新任务状态为成功
      await updateTaskStatus(TASK_NAMES.MISSING_DATA_UPDATE, {
        lastRun: new Date(),
        nextRun: nextRunTime,
        status: 'idle',
        message: `已更新 ${updatedCount} 条缺失数据 (手动触发)`
      });
      
      logger.debug(`手动触发的缺失数据更新完成: 更新了 ${updatedCount} 条数据`);
      
      return NextResponse.json({
        success: true,
        updated: updatedCount,
        message: `成功更新了 ${updatedCount} 条缺失数据`
      });
      
    } catch (error) {
      // 清除超时计时器
      if (timeoutId) clearTimeout(timeoutId);
      
      // 记录错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('手动触发的缺失数据更新失败:', errorMessage);
      
      // 更新任务状态为失败
      await updateTaskStatus(
        TASK_NAMES.MISSING_DATA_UPDATE, 
        {
          status: 'failed',
          lastRun: new Date(),
          message: `手动触发更新失败: ${errorMessage}`
        }
      );
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    } finally {
      // 无论成功还是失败，都标记任务已完成
      isRunning = false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('处理手动触发缺失数据更新请求时出错:', errorMessage);
    return NextResponse.json(
      { error: '执行失败', message: errorMessage },
      { status: 500 }
    );
  }
} 