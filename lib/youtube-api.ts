import axios from 'axios';
import { setupProxy } from './proxy';
import { logger } from './logger';
import { getAllEnvSettings } from './env-service';
import { trackApiOperation, setDailyQuotaUsed } from './quota-tracker';
import { getActiveApiKey, trackApiUsage, QuotaOperationType } from './api-key-service';

interface YoutubeDataParams {
  type: 'channel' | 'playlist';
  sourceId: string;
  maxResults?: number;
  publishedAfter?: Date;
}

// YouTube API响应接口
interface YoutubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
    resourceId?: {
      videoId: string;
    };
  };
  contentDetails: {
    duration: string;
  };
}

interface SearchResponseItem {
  id: {
    videoId: string;
  } | string;
  snippet: any;
}

interface PlaylistItem {
  snippet: {
    publishedAt: string;
    resourceId: {
      videoId: string;
    };
  };
}

// 从环境变量获取设置
async function getSettings() {
  // 从环境变量获取设置
  return await getAllEnvSettings();
}

// 解析ISO 8601时长格式 (PT1H2M3S)
export function parseDuration(duration: string | null | undefined): number {
  // 添加对null、undefined和非字符串类型的处理
  if (duration === null || duration === undefined || typeof duration !== 'string') {
    logger.warn(`收到非字符串类型的duration值: ${duration}，类型: ${typeof duration}`);
    return 0;
  }
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 解析YouTube API响应头中的配额使用情况
function parseQuotaHeaders(headers: any): void {
  try {
    // 尝试从响应头中获取配额使用情况
    const quotaUsage = headers['x-quota-usage'];
    if (quotaUsage) {
      const match = quotaUsage.match(/(\d+)\/\d+/);
      if (match && match[1]) {
        const used = parseInt(match[1], 10);
        if (!isNaN(used)) {
          setDailyQuotaUsed(used);
        }
      }
    }
  } catch (error: unknown) {
    // 忽略解析错误，不影响主流程
    if (error instanceof Error) {
      logger.debug('解析配额头信息失败', error);
    } else {
      logger.debug('解析配额头信息失败', String(error));
    }
  }
}

// 从API获取单个视频的详细信息
export async function fetchYouTubeVideosDetails(videoIds: string[]) {
  try {
    // 获取设置 - 使用服务器兼容的方法
    const settingsObj = await getSettings();
    
    // 获取活跃的API密钥
    const apiKeyData = await getActiveApiKey();
    if (!apiKeyData) {
      throw new Error('没有可用的YouTube API密钥，所有密钥配额已用完或无效');
    }
    
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
    
    // 记录API调用配额
    trackApiOperation('VIDEOS_LIST', 'videos.list');
    
    const endpoint = 'videos.list';
    const operationType: QuotaOperationType = 'VIDEOS_LIST';
    
    try {
      const response = await http.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${idsString}&key=${apiKeyData.key}`
      );
      
      // 记录API密钥使用情况
      await trackApiUsage(apiKeyData.keyId, operationType, endpoint, true);
      
      // 解析响应头中的配额使用情况
      parseQuotaHeaders(response.headers);
      
      return response.data.items.map((item: YoutubeVideoItem) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        publishedAt: new Date(item.snippet.publishedAt),
        durationSeconds: parseDuration(item.contentDetails?.duration)
      }));
    } catch (error: unknown) {
      // 记录API失败
      if (apiKeyData) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await trackApiUsage(apiKeyData.keyId, operationType, endpoint, false, errorMessage);
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error('获取YouTube视频详情失败', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// 获取YouTube数据
export async function fetchYouTubeData({ type, sourceId, maxResults = 10, publishedAfter }: YoutubeDataParams) {
  try {
    // 获取设置 - 使用服务器兼容的方法
    const settingsObj = await getSettings();
    
    // 获取活跃的API密钥
    const apiKeyData = await getActiveApiKey();
    if (!apiKeyData) {
      throw new Error('没有可用的YouTube API密钥，所有密钥配额已用完或无效');
    }
    
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
    logger.debug(`开始获取YouTube数据, 类型: ${type}, ID: ${sourceId}`);
    
    if (type === 'channel') {
      // 获取频道视频
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId: sourceId,
        maxResults: maxResults.toString(),
        order: 'date',
        type: 'video',
        key: apiKeyData.key
      });
      
      if (publishedAfter) {
        searchParams.append('publishedAfter', publishedAfter.toISOString());
      }
      
      logger.debug(`请求频道视频列表: ${sourceId}`);
      
      // 记录API调用配额 - 搜索操作消耗100单位
      trackApiOperation('SEARCH_OPERATION', 'search.list');
      
      let searchResponse;
      const searchEndpoint = 'search.list';
      const searchOperationType: QuotaOperationType = 'SEARCH_OPERATION';
      
      try {
        searchResponse = await http.get(
          `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
        );
        
        // 记录API密钥使用情况
        await trackApiUsage(apiKeyData.keyId, searchOperationType, searchEndpoint, true);
        
        // 解析响应头中的配额使用情况
        parseQuotaHeaders(searchResponse.headers);
      } catch (error: unknown) {
        // 记录API失败
        const errorMessage = error instanceof Error ? error.message : String(error);
        await trackApiUsage(apiKeyData.keyId, searchOperationType, searchEndpoint, false, errorMessage);
        throw error;
      }
      
      if (searchResponse.data.items?.length > 0) {
        // 获取视频ID列表
        const videoIds = searchResponse.data.items.map((item: SearchResponseItem) => {
          if (typeof item.id === 'string') {
            return item.id;
          }
          return item.id.videoId;
        });
        logger.debug(`找到 ${videoIds.length} 个视频, 获取详细信息`);
        
        // 获取视频详细信息，包括时长
        // 记录API调用配额
        trackApiOperation('VIDEOS_LIST', 'videos.list');
        
        // 可能需要获取新的API密钥，因为搜索操作可能已经消耗了配额
        const videoApiKeyData = await getActiveApiKey();
        if (!videoApiKeyData) {
          throw new Error('没有可用的YouTube API密钥，所有密钥配额已用完或无效');
        }
        
        const videoEndpoint = 'videos.list';
        const videoOperationType: QuotaOperationType = 'VIDEOS_LIST';
        
        let videoResponse;
        try {
          videoResponse = await http.get(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${videoApiKeyData.key}`
          );
          
          // 记录API密钥使用情况
          await trackApiUsage(videoApiKeyData.keyId, videoOperationType, videoEndpoint, true);
          
          // 解析响应头中的配额使用情况
          parseQuotaHeaders(videoResponse.headers);
        } catch (error: unknown) {
          // 记录API失败
          const errorMessage = error instanceof Error ? error.message : String(error);
          await trackApiUsage(videoApiKeyData.keyId, videoOperationType, videoEndpoint, false, errorMessage);
          throw error;
        }
        
        videos = videoResponse.data.items.map((item: YoutubeVideoItem) => {
          const duration = parseDuration(item.contentDetails?.duration);
          logger.debug(`视频 ${item.id}: 标题=${item.snippet.title}, 时长=${duration}秒`);
          
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
        key: apiKeyData.key
      });
      
      // 记录API调用配额
      trackApiOperation('PLAYLIST_ITEMS_LIST', 'playlistItems.list');
      
      const playlistEndpoint = 'playlistItems.list';
      const playlistOperationType: QuotaOperationType = 'PLAYLIST_ITEMS_LIST';
      
      let playlistResponse;
      try {
        playlistResponse = await http.get(
          `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams.toString()}`
        );
        
        // 记录API密钥使用情况
        await trackApiUsage(apiKeyData.keyId, playlistOperationType, playlistEndpoint, true);
        
        // 解析响应头中的配额使用情况
        parseQuotaHeaders(playlistResponse.headers);
      } catch (error: unknown) {
        // 记录API失败
        const errorMessage = error instanceof Error ? error.message : String(error);
        await trackApiUsage(apiKeyData.keyId, playlistOperationType, playlistEndpoint, false, errorMessage);
        throw error;
      }
      
      if (playlistResponse.data.items?.length > 0) {
        // 筛选出发布日期满足条件的视频
        let filteredItems = playlistResponse.data.items;
        if (publishedAfter) {
          filteredItems = filteredItems.filter((item: PlaylistItem) => 
            new Date(item.snippet.publishedAt) > publishedAfter
          );
        }
        
        if (filteredItems.length > 0) {
          // 获取视频ID列表
          const videoIds = filteredItems.map((item: PlaylistItem) => item.snippet.resourceId.videoId).join(',');
          
          // 获取视频详细信息，包括时长
          // 记录API调用配额
          trackApiOperation('VIDEOS_LIST', 'videos.list');
          
          const videoResponse = await http.get(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKeyData.key}`
          );
          
          // 解析响应头中的配额使用情况
          parseQuotaHeaders(videoResponse.headers);
          
          videos = videoResponse.data.items.map((item: YoutubeVideoItem) => ({
            youtubeId: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            publishedAt: new Date(item.snippet.publishedAt),
            duration: parseDuration(item.contentDetails?.duration),
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
          }));
        }
      }
    }
    
    logger.debug(`处理完成, 返回 ${videos.length} 个视频`);
    return videos;
  } catch (error: unknown) {
    logger.error('获取YouTube数据失败', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// 为了向后兼容，添加单个视频获取函数
export async function fetchVideoDetails(videoId: string) {
  const videos = await fetchYouTubeVideosDetails([videoId]);
  return videos[0];
}