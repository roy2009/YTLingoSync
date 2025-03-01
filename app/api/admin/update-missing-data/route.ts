import { NextRequest, NextResponse } from 'next/server';
import { updateMissingVideoData } from '@/lib/update-trans-pending-video';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 获取数据库中缺少时长信息的视频数量
    const count = await prisma.video.count({
      where: { duration: null }
    });
    
    // 开始更新流程
    logger.debug(`开始批量更新，共有 ${count} 个视频缺少时长信息`);
    await updateMissingVideoData();
    
    return NextResponse.json({ 
      success: true, 
      message: `更新完成，处理了最多50个视频，还有约 ${Math.max(0, count - 50)} 个待处理` 
    });
  } catch (error) {
    logger.error('批量更新视频数据失败', error);
    return NextResponse.json(
      { error: '更新失败，请查看日志' }, 
      { status: 500 }
    );
  }
} 