import axios from 'axios';
import { setupProxy } from './proxy';
import { logger } from './logger';
import { prisma } from './prisma';

interface YoutubeDataParams {
  type: 'channel' | 'playlist';
  sourceId: string;
  maxResults?: number;
  publishedAfter?: Date;
}

// 仅限服务器端 - 从数据库获取设置
async function getSettings() {
  // 从数据库获取设置
  const settingsFromDb = await prisma.setting.findMany();
  
  // 转换为对象格式
  return settingsFromDb.reduce((acc, item) => {
    acc[item.id] = item.value;
    return acc;
  }, {});
}

// 解析ISO 8601时长格式 (PT1H2M3S)
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 从API获取单个视频的详细信息
export async function fetchYouTubeVideosDetails(videoIds: string[]) {
  try {
    // 获取设置 - 使用服务器兼容的方法
    const settingsObj = await getSettings();
    
    const YOUTUBE_API_KEY = settingsObj.YOUTUBE_API_KEY;
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    // 创建使用代理的axios实例
    const http = setupProxy(proxyConfig);
    
    // 最多一次获取50个视频
    const idsString = videoIds.slice(0, 50).join(',');
    
    const response = await http.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${idsString}&key=${YOUTUBE_API_KEY}`
    );
    
    return response.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: new Date(item.snippet.publishedAt),
      durationSeconds: parseDuration(item.contentDetails.duration)
    }));
  } catch (error) {
    logger.error('获取YouTube视频详情失败', error);
    throw error;
  }
}

// 获取YouTube数据
export async function fetchYouTubeData({ type, sourceId, maxResults = 10, publishedAfter }: YoutubeDataParams) {
  try {
    // 获取设置 - 使用服务器兼容的方法
    const settingsObj = await getSettings();
    
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
    
    let videos = [];
    logger.info(`开始获取YouTube数据, 类型: ${type}, ID: ${sourceId}`);
    
    if (type === 'channel') {
      // 获取频道视频
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId: sourceId,
        maxResults: maxResults.toString(),
        order: 'date',
        type: 'video',
        key: YOUTUBE_API_KEY
      });
      
      if (publishedAfter) {
        searchParams.append('publishedAfter', publishedAfter.toISOString());
      }
      
      logger.info(`请求频道视频列表: ${sourceId}`);
      const searchResponse = await http.get(
        `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
      );
      
      if (searchResponse.data.items?.length > 0) {
        // 获取视频ID列表
        const videoIds = searchResponse.data.items.map(item => item.id.videoId);
        logger.info(`找到 ${videoIds.length} 个视频, 获取详细信息`);
        
        // 获取视频详细信息，包括时长
        const videoResponse = await http.get(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
        );
        
        videos = videoResponse.data.items.map(item => {
          const duration = parseDuration(item.contentDetails.duration);
          logger.info(`视频 ${item.id}: 标题=${item.snippet.title}, 时长=${duration}秒`);
          
          return {
            youtubeId: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            publishedAt: new Date(item.snippet.publishedAt),
            duration: duration,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
          };
        });
      }
    } else if (type === 'playlist') {
      // 获取播放列表视频
      const playlistParams = new URLSearchParams({
        part: 'snippet',
        playlistId: sourceId,
        maxResults: maxResults.toString(),
        key: YOUTUBE_API_KEY
      });
      
      const playlistResponse = await http.get(
        `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams.toString()}`
      );
      
      if (playlistResponse.data.items?.length > 0) {
        // 筛选出发布日期满足条件的视频
        let filteredItems = playlistResponse.data.items;
        if (publishedAfter) {
          filteredItems = filteredItems.filter(item => 
            new Date(item.snippet.publishedAt) > publishedAfter
          );
        }
        
        if (filteredItems.length > 0) {
          // 获取视频ID列表
          const videoIds = filteredItems.map(item => item.snippet.resourceId.videoId).join(',');
          
          // 获取视频详细信息，包括时长
          const videoResponse = await http.get(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
          );
          
          videos = videoResponse.data.items.map(item => ({
            youtubeId: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            publishedAt: new Date(item.snippet.publishedAt),
            duration: parseDuration(item.contentDetails.duration),
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
          }));
        }
      }
    }
    
    logger.info(`处理完成, 返回 ${videos.length} 个视频`);
    return videos;
  } catch (error) {
    logger.error('获取YouTube数据失败', error);
    throw error;
  }
}

// 为了向后兼容，添加单个视频获取函数
export async function fetchVideoDetails(videoId: string) {
  const videos = await fetchYouTubeVideosDetails([videoId]);
  return videos[0];
} 