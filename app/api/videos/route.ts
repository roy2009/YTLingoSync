import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 获取视频列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subscriptionId = searchParams.get('subscriptionId');
    const timeRange = searchParams.get('timeRange');
    const translationStatus = searchParams.get('translationStatus');
    
    // 构建查询条件
    const where: any = {};
    
    // 添加订阅ID筛选
    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }
    
    // 添加翻译状态筛选
    if (translationStatus) {
      if (translationStatus === 'null') {
        // 处理未翻译状态（translationStatus为null的情况）
        where.translationStatus = null;
      } else {
        // 处理其他翻译状态
        where.translationStatus = translationStatus;
      }
    }
    
    // 添加时间范围筛选
    if (timeRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'today':
          // 今天凌晨开始
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          // 昨天凌晨开始
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          // 设置时间范围为昨天一整天
          where.publishedAt = {
            gte: startDate,
            lt: endDate
          };
          break;
        case 'week':
          // 本周一开始
          const day = now.getDay();
          const diff = (day === 0 ? 6 : day - 1); // 将周日视为7，周一视为1
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
          break;
        case 'month':
          // 本月1号开始
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // 1970年1月1日，表示所有时间
      }
      
      // 如果不是昨天(昨天已经设置了完整的时间范围)，则设置大于等于起始日期
      if (timeRange !== 'yesterday') {
        where.publishedAt = {
          gte: startDate
        };
      }
    }
    
    // 查询视频并包含订阅信息
    const videos = await prisma.video.findMany({
      where,
      include: {
        subscription: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            type: true,
            sourceId: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'  // 按发布日期倒序排列
      },
      take: 50
    });
    
    // 处理视频数据，为每个视频添加频道信息
    const processedVideos = videos.map(video => {
      let channelThumbnailUrl = null;
      let channelTitle = video.channelTitle || '未知频道';
      
      if (video.subscription) {
        if (video.subscription.type === 'channel') {
          // 频道订阅使用订阅信息中的缩略图
          channelThumbnailUrl = video.subscription.thumbnailUrl;
          channelTitle = video.subscription.name;
        } else if (video.subscription.type === 'playlist') {
          // 播放列表使用本地图标，不通过API获取
          channelThumbnailUrl = `/icons/playlist-color-${getColorForPlaylist(video.subscription.id)}.svg`;
          channelTitle = video.subscription.name || '播放列表';
        }
      }
      
      return {
        ...video,
        channelThumbnailUrl,
        channelTitle,
        subscriptionType: video.subscription?.type,
        subscription: undefined
      };
    });
    
    // 返回处理后的数据
    return NextResponse.json({
      videos: processedVideos
    });
  } catch (error) {
    // 详细记录错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
    
    logger.error('获取视频列表失败', errorDetails);
    console.error('视频列表查询错误详情:', {
      timestamp: new Date().toISOString(),
      ...errorDetails
    });

    return NextResponse.json(
      { error: '获取视频列表失败', details: errorDetails },
      { status: 500 }
    );
  }
}

// 为播放列表分配一个固定颜色，使每个播放列表有唯一且一致的颜色
function getColorForPlaylist(id: string): string {
  // 从播放列表ID生成一个数字
  const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 根据这个数字选择一种颜色
  const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
  return colors[num % colors.length];
}