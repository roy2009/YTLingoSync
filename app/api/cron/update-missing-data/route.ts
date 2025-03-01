import { NextRequest, NextResponse } from 'next/server';
import { updatePendingVideoData } from '@/lib/update-trans-pending-video';
import { logger } from '@/lib/logger';

// 通过Vercel Cron Jobs每天运行一次
export const config = {
  runtime: 'edge',
  schedule: '0 0 * * *', // 每天午夜运行
};

export async function GET(request: NextRequest) {
  try {
    logger.debug('开始定时更新缺失的视频数据');
    await updatePendingVideoData();
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('定时更新缺失视频数据失败', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
} 