import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/db';
import { parseDuration } from '@/lib/utils';

// 配置 YouTube API
const youtube = google.youtube('v3');

export async function POST(request: Request) {
  try {
    // 假设这些变量是从某处获取的
    const subscription = await prisma.subscription.findFirst();
    const videoId = ''; // 需要从请求或其他地方获取

    // 获取视频详情
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId]
    });

    const videoData = videoResponse.data.items?.[0];
    if (!videoData) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 提取频道信息
    const channelId = videoData.snippet?.channelId;
    const channelTitle = videoData.snippet?.channelTitle;

    // 保存到数据库
    const video = await prisma.video.create({
      data: {
        youtubeId: videoId,
        title: videoData.snippet?.title || '未知标题',
        description: videoData.snippet?.description || null,
        thumbnailUrl: videoData.snippet?.thumbnails?.high?.url || 
                     videoData.snippet?.thumbnails?.medium?.url || 
                     videoData.snippet?.thumbnails?.default?.url || null,
        publishedAt: new Date(videoData.snippet?.publishedAt || Date.now()),
        duration: videoData.contentDetails?.duration ? parseDuration(videoData.contentDetails.duration) : null,
        subscriptionId: subscription?.id,
        channelId: channelId || null,
        channelTitle: channelTitle || null
      }
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error('同步视频时出错:', error);
    return NextResponse.json({ error: '同步失败' }, { status: 500 });
  }
} 