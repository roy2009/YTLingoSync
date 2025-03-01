import { NextResponse } from 'next/server';
import { startTransPendingVideoUpdateJob, stopTransPendingVideoUpdateJob } from '@/lib/update-trans-pending-video-job';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    logger.debug('正在重启翻译排队视频任务...');
    
    // 先停止现有任务
    stopTransPendingVideoUpdateJob();
    
    // 然后启动新任务
    const result = await startTransPendingVideoUpdateJob();
    
    if (result) {
      logger.debug('翻译排队视频任务重启成功');
      return NextResponse.json({ success: true, message: '翻译排队视频任务已重启' });
    } else {
      logger.warn('翻译排队视频任务重启失败，可能已被禁用');
      return NextResponse.json(
        { success: false, message: '翻译排队视频任务重启失败，可能已被禁用' },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('重启翻译排队视频任务出错:', errorMessage);
    return NextResponse.json(
      { error: '重启失败', message: errorMessage },
      { status: 500 }
    );
  }
} 