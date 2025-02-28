import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchVideoDetails } from '@/lib/youtube-api';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: '必须提供YouTube视频URL' }, { status: 400 });
    }
    
    // 从URL中提取YouTube视频ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch || !videoIdMatch[1]) {
      return NextResponse.json({ error: '无效的YouTube视频URL' }, { status: 400 });
    }
    
    const youtubeId = videoIdMatch[1];
    
    // 检查视频是否已存在
    const existingVideo = await prisma.video.findFirst({
      where: { youtubeId }
    });
    
    if (existingVideo) {
      return NextResponse.json({ message: '该视频已在库中', video: existingVideo });
    }
    
    // 获取YouTube视频详情
    const videoDetails = await fetchVideoDetails(youtubeId);
    
    if (!videoDetails) {
      return NextResponse.json({ error: '无法获取视频信息' }, { status: 500 });
    }
    
    // 创建新视频记录
    const newVideo = await prisma.video.create({
      data: {
        youtubeId,
        title: videoDetails.title,
        description: videoDetails.description,
        thumbnailUrl: videoDetails.thumbnailUrl,
        publishedAt: videoDetails.publishedAt,
        duration: videoDetails.duration,
        channelId: videoDetails.channelId,
        channelTitle: videoDetails.channelTitle,
        channelThumbnailUrl: videoDetails.channelThumbnailUrl,
      }
    });
    
    return NextResponse.json({ 
      message: '视频成功添加', 
      video: newVideo 
    });
    
  } catch (error) {
    console.error('添加视频时出错:', error);
    return NextResponse.json({ error: '添加视频时出错' }, { status: 500 });
  }
} 