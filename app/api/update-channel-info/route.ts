import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 限制仅允许管理员访问此API
    // ... 权限验证代码 ...

    // 获取所有没有频道ID的视频
    const videos = await prisma.video.findMany({
      where: {
        channelId: null
      },
      take: 50 // 每次处理50个，避免超时
    });

    logger.debug(`找到 ${videos.length} 个需要更新频道信息的视频`);
    
    if (videos.length === 0) {
      return NextResponse.json({ message: "没有需要更新的视频" });
    }

    // 分组批量处理
    const videoGroups = [];
    for (let i = 0; i < videos.length; i += 10) {
      videoGroups.push(videos.slice(i, i + 10));
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    let updateCount = 0;
    let errorCount = 0;

    // 处理每组视频
    for (const group of videoGroups) {
      const videoIds = group.map(v => v.youtubeId);
      
      try {
        // 批量获取视频信息
        const videoResponse = await youtube.videos.list({
          part: ['snippet'],
          id: videoIds
        });

        // 处理返回的视频信息
        for (const videoData of videoResponse.data.items || []) {
          const youtubeId = videoData.id;
          const channelId = videoData.snippet?.channelId;
          const channelTitle = videoData.snippet?.channelTitle;

          if (youtubeId && channelId) {
            // 更新数据库
            await prisma.video.updateMany({
              where: { youtubeId },
              data: {
                channelId,
                channelTitle: channelTitle || null
              }
            });
            updateCount++;
          }
        }
      } catch (error) {
        logger.error(`更新频道信息时出错: ${error}`);
        errorCount += group.length;
      }

      // 添加延迟，避免API配额限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      message: `频道信息更新完成`,
      stats: {
        total: videos.length,
        updated: updateCount,
        failed: errorCount
      }
    });
  } catch (error) {
    logger.error(`更新频道信息失败: ${error}`);
    return NextResponse.json(
      { error: '更新频道信息失败' },
      { status: 500 }
    );
  }
} 