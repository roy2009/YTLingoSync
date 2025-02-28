import { NextResponse } from 'next/server';
import axios from 'axios';
import { setupProxy } from '@/lib/proxy';
import { logger } from '@/lib/logger';
import { parseDuration } from '@/lib/youtube-api';

export async function POST(request: Request) {
  try {
    const { type, sourceId } = await request.json();

    logger.debug('获取设置');
    
    // 获取设置
    const settingsResponse = await fetch(new URL('/api/settings', request.url));
    if (!settingsResponse.ok) {
      throw new Error(`获取设置失败: ${settingsResponse.statusText}`);
    }
/*
    let settings;
    try {
      const data = await settingsResponse.json();
      if (!data.settings || !Array.isArray(data.settings)) {
        throw new Error('设置数据格式不正确');
      }
      settings = data.settings;
    } catch (error) {
      const err = error as Error;
      throw new Error('获取设置失败：' + err.message);
    }
*/
  let settings;
  const data = await settingsResponse.json();
  settings = data.settings;

    
    // 转换为对象格式
    const settingsObj = settings.reduce((acc: { [key: string]: string }, item: { id: string, value: string }) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    // 获取代理配置和API密钥
    const YOUTUBE_API_KEY = settingsObj.YOUTUBE_API_KEY;
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    // 创建可能使用代理的axios实例
    const http = setupProxy(proxyConfig);
    
    if (!type || !sourceId) {
      return NextResponse.json(
        { error: '请提供订阅类型和ID' },
        { status: 400 }
      );
    }
    
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: '未配置YouTube API密钥，请先在设置中配置' },
        { status: 400 }
      );
    }
    
    let url, name, logoUrl = null, videos = [];
    let logs = ['开始测试YouTube API连接...'];
    
    logger.debug('POST /api/subscriptions/test');
    try {
      // 获取频道或播放列表信息
      if (type === 'channel') {
        logs.push(`正在查询频道信息: ID=${sourceId}`);
        try {
          const channelResponse = await http.get(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${sourceId}&key=${YOUTUBE_API_KEY}`,
            { 
              timeout: 10000, // 10秒超时
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
          logs.push('✅ 频道API调用成功');
          
          if (channelResponse.data.items && channelResponse.data.items.length > 0) {
            name = channelResponse.data.items[0].snippet.title;
            // 获取频道logo
            logoUrl = channelResponse.data.items[0].snippet.thumbnails.high?.url || 
                     channelResponse.data.items[0].snippet.thumbnails.default?.url;
            logs.push(`✅ 找到频道: "${name}"`);
            
            // 获取频道最新视频
            logs.push('正在获取频道最新视频...');
            try {
              const videosResponse = await http.get(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${sourceId}&order=date&maxResults=3&type=video&key=${YOUTUBE_API_KEY}`,
                { timeout: 10000 }
              );
              logs.push('✅ 视频列表API调用成功');
              
              // 如果有视频，获取详细信息
              if (videosResponse.data.items && videosResponse.data.items.length > 0) {
                const videoIds = videosResponse.data.items.map((item: YouTubeVideoItem) => {
                  if (typeof item.id === 'string') {
                    return item.id;
                  }
                  return item.id.videoId;
                }).join(',');
                logs.push(`找到 ${videosResponse.data.items.length} 个视频，获取详细信息...`);
                
                const videoDetailsResponse = await http.get(
                  `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
                );
                logs.push('视频详情API调用成功');
                
                videos = videoDetailsResponse.data.items.map((video: YouTubeVideoItem) => {
                  // 获取并解析视频时长
                  const duration = video.contentDetails?.duration;
                  const durationSeconds = duration ? parseDuration(duration) : null;
                  
                  return {
                    id: video.id,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
                    publishedAt: video.snippet.publishedAt,
                    duration: durationSeconds
                  };
                });
                logs.push(`处理了 ${videos.length} 个视频信息`);
              } else {
                logs.push('频道中没有找到视频');
              }
            } catch (videoError) {
              const error = videoError as Error;
              logs.push(`❌ 获取视频列表失败: ${error.message}`);
              // 依然返回成功，因为至少频道信息是正确的
              return NextResponse.json({
                success: true,
                name,
                thumbnailUrl: logoUrl,
                videos: [],
                logs
              });
            }
          } else {
            logs.push('❌ 未找到频道信息');
            return NextResponse.json(
              { error: '未找到频道，请检查ID是否正确', logs },
              { status: 404 }
            );
          }
        } catch (channelError) {
          const error = channelError as Error;
          logs.push(`❌ 频道API调用失败: ${error.message}`);
          throw error; // 向上抛出错误，由外层错误处理器处理
        }
      } else if (type === 'playlist') {
        logs.push(`正在查询播放列表信息: ID=${sourceId}`);
        const response = await http.get(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${sourceId}&key=${YOUTUBE_API_KEY}`
        );
        logs.push('播放列表API调用成功');
        
        if (response.data.items && response.data.items.length > 0) {
          name = response.data.items[0].snippet.title;
          // 获取播放列表缩略图作为logo
          logoUrl = response.data.items[0].snippet.thumbnails.high?.url || 
                   response.data.items[0].snippet.thumbnails.default?.url;
          logs.push(`找到播放列表: ${name}`);
          
          // 获取播放列表中的视频
          logs.push('正在获取播放列表视频...');
          const videosResponse = await http.get(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${sourceId}&maxResults=3&key=${YOUTUBE_API_KEY}`
          );
          logs.push('播放列表项API调用成功');
          
          // 如果有视频，获取详细信息
          if (videosResponse.data.items && videosResponse.data.items.length > 0) {
            const videoIds = videosResponse.data.items
              .filter((item: YouTubeVideoItem) => item.snippet?.resourceId?.videoId)
              .map((item: YouTubeVideoItem) => item.snippet.resourceId.videoId)
              .join(',');
            logs.push(`找到 ${videosResponse.data.items.length} 个视频，获取详细信息...`);
            
            const videoDetailsResponse = await http.get(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
            );
            logs.push('视频详情API调用成功');
            
            videos = videoDetailsResponse.data.items.map((video: YouTubeVideoItem) => {
              // 获取并解析视频时长
              const duration = video.contentDetails?.duration;
              const durationSeconds = duration ? parseDuration(duration) : null;
              
              return {
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
                publishedAt: video.snippet.publishedAt,
                duration: durationSeconds
              };
            });
            logs.push(`处理了 ${videos.length} 个视频信息`);
          } else {
            logs.push('播放列表中没有找到视频');
          }
        } else {
          logs.push('未找到播放列表信息');
          return NextResponse.json(
            { error: '未找到播放列表，请检查ID是否正确', logs },
            { status: 404 }
          );
        }
      } else {
        logs.push(`不支持的订阅类型: ${type}`);
        return NextResponse.json(
          { error: '不支持的订阅类型', logs },
          { status: 400 }
        );
      }
      
      logs.push('测试完成：成功');
      return NextResponse.json({
        success: true,
        name,
        thumbnailUrl: logoUrl,
        videos,
        logs
      });
    } catch (error: unknown) {
      const err = error as YouTubeAPIError;
      logs.push(`API调用失败: ${err.message}`);
      logger.error('测试YouTube API连接失败', err, 'subscription-test');
      
      // 检查是否为配额超限错误
      if (err.response && err.response.data && err.response.data.error) {
        const apiError = err.response.data.error;
        if (apiError.code === 403 && apiError.errors && apiError.errors[0].reason === 'quotaExceeded') {
          return NextResponse.json(
            { error: 'YouTube API配额已超限，请稍后再试或更换API密钥', logs },
            { status: 403 }
          );
        }
        
        // 添加更详细的API错误信息
        return NextResponse.json(
          { 
            error: `YouTube API错误: ${apiError.message || '未知错误'}`, 
            details: JSON.stringify(apiError),
            logs 
          },
          { status: err.response?.status || 500 }
        );
      }
      
      // 对于其他错误，提供更具体的信息
      return NextResponse.json(
        { 
          error: `YouTube API调用失败: ${err.message || '未知错误'}`,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
          logs 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const err = error as Error;
    logger.error('测试订阅失败', err.message || '未知错误', 'subscription-test');
    return NextResponse.json(
      { error: '测试订阅失败', logs: ['请求处理失败'] },
      { status: 500 }
    );
  }
}

interface YouTubeVideoItem {
  id: { videoId: string } | string;
  snippet: {
    resourceId?: { videoId: string };
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
    publishedAt: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

interface YouTubeAPIError {
  message: string;
  response?: {
    status: number;
    data: {
      error: {
        code: number;
        message: string;
        errors: Array<{ reason: string }>;
      };
    };
  };
  stack?: string;
} 