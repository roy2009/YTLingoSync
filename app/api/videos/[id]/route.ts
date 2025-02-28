import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 获取单个视频详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 确保正确处理动态路由参数
    const videoId = await params.id;
    
    if (!videoId) {
      return NextResponse.json(
        { error: '视频ID不能为空' },
        { status: 400 }
      );
    }
    
    // 查询视频详情，包含订阅信息
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });
    
    if (!video) {
      return NextResponse.json(
        { error: '视频不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(video);
  } catch (error) {
    logger.error('获取视频详情失败', error);
    return NextResponse.json(
      { error: '获取视频详情失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 确保正确处理动态路由参数
    const videoId = await params.id;
    
    if (!videoId) {
      return NextResponse.json(
        { error: '视频ID不能为空' },
        { status: 400 }
      );
    }
    
    // 首先查询视频是否存在
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      return NextResponse.json(
        { error: '视频不存在' },
        { status: 404 }
      );
    }
    
    // 删除视频
    await prisma.video.delete({
      where: { id: videoId }
    });
    
    logger.info(`视频已删除: ${videoId}`, { title: video.title });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('删除视频失败', error);
    return NextResponse.json(
      { error: '删除视频失败' },
      { status: 500 }
    );
  }
}