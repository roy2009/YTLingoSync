import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchYouTubeData } from '@/lib/youtube-api';
import { syncSubscription } from '@/lib/sync-service';
import { logger } from '@/lib/logger';
import { setupProxy } from '@/lib/proxy';

// 获取所有订阅
export async function GET() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        _count: {
          select: { videos: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
        
      }
    });
    
    return NextResponse.json(subscriptions);
  } catch (error) {
    logger.error('获取订阅列表失败', error);
    return NextResponse.json(
      { error: '获取订阅列表失败' },
      { status: 500 }
    );
  }
}

// 创建新订阅
export async function POST(request: Request) {
  try {
    const { type, sourceId, name } = await request.json();
    const logs = ['开始处理订阅创建请求...'];
    
    // 验证输入
    if (!type || !sourceId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 获取设置
    const settingsResponse = await fetch(new URL('/api/settings', request.url));
    //const settings = await settingsResponse.json();
    let settings;
    const data = await settingsResponse.json();
    settings = data.settings;
  
    
    // 转换为对象
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    // 获取API密钥和配置代理
    const YOUTUBE_API_KEY = settingsObj.YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      logs.push('❌ 未配置YouTube API密钥');
      return NextResponse.json(
        { error: '未配置YouTube API密钥', logs },
        { status: 400 }
      );
    }
    
    // 设置代理
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    const http = setupProxy(proxyConfig);
    
    // 检查是否已存在相同订阅
    logs.push('检查是否已存在相同订阅...');
    const existingSubscription = await prisma.subscription.findFirst({
      where: { type, sourceId }
    });
    
    if (existingSubscription) {
      logs.push(`❌ 已存在相同的${type === 'channel' ? '频道' : '播放列表'}订阅`);
      return NextResponse.json(
        { error: `已存在相同的${type === 'channel' ? '频道' : '播放列表'}订阅`, logs },
        { status: 400 }
      );
    }
    
    logs.push(`正在获取${type === 'channel' ? '频道' : '播放列表'}信息...`);
    
    let channelName, thumbnail;
    
    try {
      if (type === 'channel') {
        // 获取频道信息
        const response = await http.get(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${sourceId}&key=${YOUTUBE_API_KEY}`,
          {
            timeout: 10000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.data.items || response.data.items.length === 0) {
          logs.push('❌ 未找到频道信息');
          return NextResponse.json(
            { error: '未找到频道，请检查ID是否正确', logs },
            { status: 404 }
          );
        }
        
        const channel = response.data.items[0];
        channelName = channel.snippet.title;
        thumbnail = channel.snippet.thumbnails.high?.url || 
                   channel.snippet.thumbnails.default?.url;
        logs.push(`✅ 找到频道: "${channelName}"`);
        
      } else if (type === 'playlist') {
        // 获取播放列表信息
        const response = await http.get(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${sourceId}&key=${YOUTUBE_API_KEY}`,
          {
            timeout: 10000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.data.items || response.data.items.length === 0) {
          logs.push('❌ 未找到播放列表信息');
          return NextResponse.json(
            { error: '未找到播放列表，请检查ID是否正确', logs },
            { status: 404 }
          );
        }
        
        const playlist = response.data.items[0];
        channelName = playlist.snippet.title;
        thumbnail = playlist.snippet.thumbnails.high?.url || 
                   playlist.snippet.thumbnails.default?.url;
        logs.push(`✅ 找到播放列表: "${channelName}"`);
      } else {
        logs.push(`❌ 不支持的订阅类型: ${type}`);
        return NextResponse.json(
          { error: '不支持的订阅类型', logs },
          { status: 400 }
        );
      }
      
      // 创建订阅
      logs.push('创建订阅记录...');
      
      // 使用从API获取的名称或用户提供的名称
      const subscriptionName = name || channelName;
      
      // 准备创建数据对象，确保与模型一致
      const subscriptionData = {
        type,
        sourceId,
        name: subscriptionName,
        thumbnailUrl: thumbnail
      };
      
      const subscription = await prisma.subscription.create({
        data: subscriptionData
      });
      
      logs.push(`✅ 订阅创建成功: ${subscription.name}`);
      
      // 获取翻译服务设置状态
      const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
      logs.push(`翻译服务: ${translationService}`);
      
      // 立即同步新订阅
      const syncLogs = [];
      const syncResult = await syncSubscription(subscription.id, syncLogs, { maxVideos: 3 });
      logs.push(...syncLogs);
      
      logger.info(`创建新订阅: ${subscription.name} (${type})`, { sourceId });
      
      return NextResponse.json({
        message: '订阅已添加',
        subscription,
        syncedCount: syncResult.syncedCount,
        logs
      });
      
    } catch (error) {
      logger.error('创建订阅失败', error, 'subscription-create');
      logs.push(`❌ 创建订阅失败: ${error.message || '未知错误'}`);
      
      // 处理API错误
      if (error.response && error.response.data && error.response.data.error) {
        const apiError = error.response.data.error;
        if (apiError.code === 403 && apiError.errors && apiError.errors[0].reason === 'quotaExceeded') {
          return NextResponse.json(
            { error: 'YouTube API配额已超限，请稍后再试或更换API密钥', logs },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: `API错误: ${apiError.message || '未知错误'}`, logs },
          { status: error.response.status || 500 }
        );
      }
      
      return NextResponse.json(
        { error: `创建订阅失败: ${error.message || '未知错误'}`, logs },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('处理订阅请求失败', error, 'subscription-create');
    return NextResponse.json(
      { error: '处理请求失败', logs: ['❌ 处理请求失败'] },
      { status: 500 }
    );
  }
}

async function syncVideosForSubscription(subscriptionId: string) {
  // 这个函数将在后台服务中实现
  // 这里仅作为API响应后的触发点
} 