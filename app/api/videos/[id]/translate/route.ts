import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { submitToHeygen } from '@/lib/heygen';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: '视频ID不能为空' }, { status: 400 });
    }
    const videoId = id;
    
    // 获取视频信息
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    
    if (!video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }
    
    // 检查视频长度，限制大于30分钟的视频
    if (video.duration && video.duration >= 1800) { // 30分钟 = 1800秒
      logger.warn(`视频时长超过30分钟，暂不处理`, { videoId, duration: video.duration });
      return NextResponse.json({
        error: '暂时仅支持30分钟以内的视频翻译',
        code: 'VIDEO_TOO_LONG'
      }, { status: 400 });
    }
    
    // 更新视频翻译状态
    await prisma.video.update({
      where: { id: videoId },
      data: {
        translationStatus: 'pending'
      }
    });
    
    // 提交到HeyGen进行翻译，使用浏览器模拟方式
    const success = await submitToHeygen(video.id);
    if (!success) {
      return NextResponse.json({
        error: 'submitToHeygen retuen false,提交翻译任务失败',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '翻译任务已提交',
      status: 'processing'
    });
  } catch (error: unknown) {
    logger.error('cache error 提交翻译任务失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: '提交翻译任务失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}