import { NextResponse } from 'next/server';
import { startMissingDataUpdateJob, stopMissingDataUpdateJob } from '@/lib/update-missing-data-job';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    logger.info('正在重启缺失数据更新任务...');
    
    // 先停止现有任务
    stopMissingDataUpdateJob();
    
    // 然后启动新任务
    const result = await startMissingDataUpdateJob();
    
    if (result) {
      logger.info('缺失数据更新任务重启成功');
      return NextResponse.json({ success: true, message: '缺失数据更新任务已重启' });
    } else {
      logger.warn('缺失数据更新任务重启失败，可能已被禁用');
      return NextResponse.json(
        { success: false, message: '缺失数据更新任务重启失败，可能已被禁用' },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('重启缺失数据更新任务出错:', errorMessage);
    return NextResponse.json(
      { error: '重启失败', message: errorMessage },
      { status: 500 }
    );
  }
} 