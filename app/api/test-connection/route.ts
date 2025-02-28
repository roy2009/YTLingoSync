import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { setupProxy } from '@/lib/proxy';

export async function GET(request: Request) {
  try {
    // 获取当前设置
    const settingsResponse = await fetch(new URL('/api/settings', request.url));
//    const settings = await settingsResponse.json();
    let settings;
    const data = await settingsResponse.json();
    settings = data.settings;
    
    // 转换为对象格式
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const YOUTUBE_API_KEY = settingsObj.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API密钥未配置' }, { status: 400 });
    }
    
    // 配置代理
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    const http = setupProxy(proxyConfig);
    
    try {
      // 测试YouTube API连接
      const response = await http.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${YOUTUBE_API_KEY}`,
        { timeout: 10000 }
      );
      
      return NextResponse.json({
        success: true,
        apiStatus: 'connected',
        protocol: 'https',
        serviceDetails: {
          youtubeApiVersion: 'v3',
          requestCount: response.headers['x-quota-usage'] || 'unknown'
        }
      });
    } catch (apiError) {
      logger.error('YouTube API连接测试失败', apiError);
      
      // 提取API错误信息
      if (apiError.response && apiError.response.data && apiError.response.data.error) {
        const error = apiError.response.data.error;
        return NextResponse.json({
          success: false,
          apiStatus: 'error',
          error: {
            code: error.code,
            message: error.message,
            errors: error.errors
          }
        }, { status: apiError.response.status });
      }
      
      return NextResponse.json({
        success: false,
        apiStatus: 'error',
        error: {
          message: apiError.message,
          code: apiError.code
        }
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('连接测试处理失败', error);
    return NextResponse.json({ 
      success: false, 
      error: '连接测试处理失败' 
    }, { status: 500 });
  }
} 