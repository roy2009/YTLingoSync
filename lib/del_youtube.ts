import axios from 'axios';
import { prisma } from './prisma';
import { logger } from './logger';
import { setupProxy } from './proxy';
import { google, youtube_v3 } from 'googleapis';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: number;
}

interface ProxyConfig {
  proxyEnabled: boolean;
  proxyUrl: string;
  proxyUsername?: string;
  proxyPassword?: string;
  verifySSL?: boolean;
}

interface YouTubeFetchParams {
  type: string;
  sourceId: string;
  maxResults?: number;
  publishedAfter?: Date;
}

export async function fetchYouTubeData(params: YouTubeFetchParams) {
  const { type, sourceId, maxResults = 10, publishedAfter } = params;
  
  try {
    // 获取API密钥和代理设置
    const settingsResponse = await fetch('/api/settings');
    const settings = await settingsResponse.json();
    
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const YOUTUBE_API_KEY = settingsObj.YOUTUBE_API_KEY;
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    // 设置代理
    const http = setupProxy(proxyConfig);
    
    // 初始化YouTube客户端
    const youtube = google.youtube({
      version: 'v3',
      auth: YOUTUBE_API_KEY
    });
    
    // 根据订阅类型获取视频
    let videoIds: string[] = [];
    
    if (type === 'channel') {
      // 获取频道最新视频
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
      
      // 使用http代理请求
      const searchResponse = await http.get(
        `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
      );
      
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        videoIds = searchResponse.data.items
          .filter(item => item.id && item.id.videoId)
          .map(item => item.id!.videoId!);
      }
    } else if (type === 'playlist') {
      // 获取播放列表视频
      const playlistParams: any = {
        part: ['snippet'],
        playlistId: sourceId,
        maxResults: maxResults
      };
      
      const playlistResponse = await youtube.playlistItems.list(playlistParams);
      
      if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
        // 过滤掉publishedAfter日期之前的视频
        let items = playlistResponse.data.items;
        
        if (publishedAfter) {
          items = items.filter(item => {
            const publishedAt = new Date(item.snippet!.publishedAt!);
            return publishedAt > publishedAfter;
          });
        }
        
        videoIds = items
          .filter(item => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
          .map(item => item.snippet!.resourceId!.videoId!);
      }
    } else {
      throw new Error(`不支持的订阅类型: ${type}`);
    }
    
    // 如果没有找到视频，返回空数组
    if (videoIds.length === 0) {
      return [];
    }
    
    // 获取视频详情
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds
    });
    
    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return [];
    }
    
    // 格式化返回数据
    return videoResponse.data.items.map(video => {
      // 解析视频时长
      let duration = 0;
      if (video.contentDetails && video.contentDetails.duration) {
        duration = parseDuration(video.contentDetails.duration);
      }
      
      return {
        youtubeId: video.id!,
        title: video.snippet!.title!,
        description: video.snippet!.description || null,
        thumbnailUrl: video.snippet!.thumbnails?.high?.url || 
                     video.snippet!.thumbnails?.default?.url || null,
        publishedAt: new Date(video.snippet!.publishedAt!),
        duration,
        channelId: video.snippet!.channelId || null,
        channelTitle: video.snippet!.channelTitle || null
      };
    });
  } catch (error) {
    logger.error('获取YouTube数据失败', error);
    throw error;
  }
}

// 解析ISO 8601时长格式
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideosForChannel(channelId: string, publishedAfter?: Date) {
  try {
    // 先获取频道的上传播放列表ID
    const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        key: YOUTUBE_API_KEY,
        id: channelId,
        part: 'contentDetails'
      }
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('无法获取频道信息');
    }
    
    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
    
    return fetchVideosForPlaylist(uploadsPlaylistId, publishedAfter);
  } catch (error) {
    console.error('获取频道视频失败:', error);
    throw error;
  }
}

export async function fetchVideosForPlaylist(playlistId: string, publishedAfter?: Date) {
  try {
    const videos = [];
    let nextPageToken = undefined;
    
    do {
      const response: any = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
        params: {
          key: YOUTUBE_API_KEY,
          playlistId,
          part: 'snippet,contentDetails',
          maxResults: 50,
          pageToken: nextPageToken
        }
      });
      
      if (!response.data.items) break;
      
      // 提取视频ID以便后续获取详细信息
      const videoIds = response.data.items.map((item: any) => item.contentDetails.videoId).join(',');
      
      // 获取视频详细信息（包括时长）
      const videoDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          key: YOUTUBE_API_KEY,
          id: videoIds,
          part: 'contentDetails,snippet'
        }
      });
      
      // 解析并格式化视频数据
      for (const item of response.data.items) {
        const videoDetail = videoDetailsResponse.data.items.find(
          (detail: any) => detail.id === item.contentDetails.videoId
        );
        
        if (!videoDetail) continue;
        
        const publishedAt = new Date(item.snippet.publishedAt);
        
        // 如果设置了publishedAfter，则跳过早于该日期的视频
        if (publishedAfter && publishedAt < publishedAfter) continue;
        
        // 解析视频时长（ISO 8601 格式，如 PT10M30S）
        const durationString = videoDetail.contentDetails.duration;
        const durationInSeconds = parseYouTubeDuration(durationString);
        
        videos.push({
          youtubeId: item.contentDetails.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          publishedAt,
          duration: durationInSeconds
        });
      }
      
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
    
    return videos;
  } catch (error) {
    console.error('获取播放列表视频失败:', error);
    throw error;
  }
}

// 解析ISO 8601格式的时长为秒数
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 获取视频详情的函数
export async function fetchVideoDetails(videoId: string | string[], proxyConfig?: ProxyConfig) {
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      console.error('未设置 YouTube API 密钥');
      return null;
    }
    
    // 设置代理（如果有）
    const http = proxyConfig ? setupProxy(proxyConfig) : axios;
    
    // 处理数组或字符串输入
    const videoIdString = Array.isArray(videoId) ? videoId.join(',') : videoId;
    
    // 获取视频详情
    const videoResponse = await http.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIdString}&key=${API_KEY}`
    );
    
    if (videoResponse.data.items.length === 0) {
      console.error('未找到视频');
      return null;
    }
    
    // 如果是数组输入，返回数组结果
    if (Array.isArray(videoId)) {
      return videoResponse.data.items.map((item: any) => {
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;
        
        // 解析视频时长
        const duration = parseDuration(contentDetails.duration);
        
        return {
          id: item.id,
          snippet: snippet,
          contentDetails: contentDetails,
          duration
        };
      });
    }
    
    // 单个视频处理逻辑保持不变
    const videoData = videoResponse.data.items[0];
    const snippet = videoData.snippet;
    const contentDetails = videoData.contentDetails;
    
    // 解析视频时长
    const duration = parseDuration(contentDetails.duration);
    
    // 获取频道缩略图
    let channelThumbnailUrl = null;
    try {
      const channelResponse = await http.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${snippet.channelId}&key=${API_KEY}`
      );
      
      if (channelResponse.data.items.length > 0) {
        channelThumbnailUrl = channelResponse.data.items[0].snippet.thumbnails.default.url;
      }
    } catch (error) {
      console.error('获取频道缩略图失败:', error);
    }
    
    return {
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      publishedAt: snippet.publishedAt,
      duration,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      channelThumbnailUrl
    };
  } catch (error) {
    console.error('获取视频详情失败:', error);
    return null;
  }
}

// 获取订阅的视频
export async function fetchSubscriptionVideos(type: string, sourceId: string, since: Date) {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error('未配置YouTube API密钥');
    }
    
    let videoItems = [];
    const publishedAfter = since.toISOString();
    
    if (type === 'channel') {
      // 先获取频道上传播放列表
      const channelResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${sourceId}&key=${YOUTUBE_API_KEY}`
      );
      
      if (!channelResponse.data.items || !channelResponse.data.items.length) {
        throw new Error('频道不存在或无法访问');
      }
      
      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
      
      // 获取播放列表中的视频
      const playlistResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`
      );
      
      videoItems = playlistResponse.data.items || [];
    } else if (type === 'playlist') {
      const playlistResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${sourceId}&key=${YOUTUBE_API_KEY}`
      );
      
      videoItems = playlistResponse.data.items || [];
    } else {
      throw new Error('无效的订阅类型');
    }
    
    // 过滤出since日期之后的视频
    const newVideoItems = videoItems.filter((item: any) => {
      const publishedAt = new Date(item.snippet.publishedAt);
      return publishedAt > since;
    });
    
    if (newVideoItems.length === 0) {
      return [];
    }
    
    // 获取视频IDs
    const videoIds = newVideoItems.map((item: any) => item.snippet.resourceId.videoId);
    
    // 获取详细视频信息 - 传递代理配置
    const proxyConfig = {
      proxyEnabled: !!process.env.HTTP_PROXY || !!process.env.HTTPS_PROXY,
      proxyUrl: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '',
      verifySSL: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
    };
    
    const videoDetails = await fetchVideoDetails(videoIds, proxyConfig);
    
    // 查找已有视频，避免重复添加
    const existingVideos = await prisma.video.findMany({
      where: {
        youtubeId: {
          in: videoIds
        }
      }
    });
    
    const existingIds = new Set(existingVideos.map(v => v.youtubeId));
    
    // 创建新视频记录
    const newVideos = [];
    
    for (const video of videoDetails) {
      if (existingIds.has(video.id)) continue;
      
      // 使用我们自己的解析函数
      let duration = 0;
      try {
        const parsed = parseIsoDuration(video.contentDetails.duration);
        duration = (
          (parsed.years || 0) * 365 * 24 * 60 * 60 +
          (parsed.months || 0) * 30 * 24 * 60 * 60 +
          (parsed.days || 0) * 24 * 60 * 60 +
          (parsed.hours || 0) * 60 * 60 +
          (parsed.minutes || 0) * 60 +
          (parsed.seconds || 0)
        );
      } catch (e) {
        logger.warn(`无法解析视频时长: ${video.id}`, e);
        duration = 0; // 默认值
      }
      
      const newVideo = await prisma.video.create({
        data: {
          youtubeId: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          publishedAt: new Date(video.snippet.publishedAt),
          duration,
          subscriptionId: await getSubscriptionId(type, sourceId)
        }
      });
      
      newVideos.push(newVideo);
    }
    
    return newVideos;
  } catch (error: unknown) {
    logger.error('获取订阅视频失败', { type, sourceId }, error as string);
    throw error;
  }
}

// 获取订阅ID
async function getSubscriptionId(type: string, sourceId: string): Promise<string> {
  const subscription = await prisma.subscription.findFirst({
    where: { type, sourceId }
  });
  
  if (!subscription) {
    throw new Error(`找不到订阅: ${type}/${sourceId}`);
  }
  
  return subscription.id;
}

// 添加自己的解析函数
function parseIsoDuration(duration: string): { 
  years?: number; 
  months?: number; 
  days?: number; 
  hours?: number; 
  minutes?: number; 
  seconds?: number;
} {
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const matches = duration.match(regex);

  if (!matches) {
    return {};
  }

  return {
    years: matches[1] ? parseInt(matches[1]) : 0,
    months: matches[2] ? parseInt(matches[2]) : 0,
    days: matches[3] ? parseInt(matches[3]) : 0,
    hours: matches[4] ? parseInt(matches[4]) : 0,
    minutes: matches[5] ? parseInt(matches[5]) : 0,
    seconds: matches[6] ? parseInt(matches[6]) : 0
  };
} 