import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { setupProxy } from '@/lib/proxy';
import { getEnvSetting } from '@/lib/env-service';
import { trackApiOperation, getQuotaStatus } from '@/lib/quota-tracker';

export async function GET(request: Request) {
  try {
    // 直接从环境变量获取设置
    const YOUTUBE_API_KEY = getEnvSetting('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API密钥未配置' }, { status: 400 });
    }
    
    // 配置代理
    const proxyConfig = {
      proxyEnabled: getEnvSetting('PROXY_ENABLED') === 'true',
      proxyUrl: getEnvSetting('PROXY_URL'),
      proxyUsername: getEnvSetting('PROXY_USERNAME'),
      proxyPassword: getEnvSetting('PROXY_PASSWORD'),
      verifySSL: getEnvSetting('VERIFY_SSL') !== 'false'
    };
    
    const http = setupProxy(proxyConfig);
    
    try {
      // 记录API调用配额
      trackApiOperation('READ_OPERATION', 'videos.list');
      
      // 测试YouTube API连接
      const response = await http.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${YOUTUBE_API_KEY}`,
        { timeout: 10000 }
      );
      
      // 获取当前配额状态
      const quotaStatus = getQuotaStatus();
      
      return NextResponse.json({
        success: true,
        apiStatus: 'connected',
        protocol: 'https',
        serviceDetails: {
          youtubeApiVersion: 'v3',
          requestCount: response.headers['x-quota-usage'] || 'unknown'
        },
        // 添加配额信息
        quotaUsage: {
          session: quotaStatus.sessionQuotaUsed,
          daily: quotaStatus.dailyQuotaUsed,
          resetTime: quotaStatus.quotaResetTime.toISOString()
        }
      });
    } catch (apiError: unknown) {
      logger.error('YouTube API连接测试失败', apiError instanceof Error ? apiError.message : String(apiError));
      
      // 提取API错误信息
      const err = apiError as any; // 类型断言
      if (err.response && err.response.data && err.response.data.error) {
        const error = err.response.data.error;
        return NextResponse.json({
          success: false,
          apiStatus: 'error',
          error: {
            code: error.code,
            message: error.message,
            errors: error.errors
          }
        }, { status: err.response.status });
      }
      
      return NextResponse.json({
        success: false,
        apiStatus: 'error',
        error: {
          message: err.message,
          code: err.code
        }
      }, { status: 500 });
    }
  } catch (error: unknown) {
    logger.error('连接测试处理失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      success: false, 
      error: '连接测试处理失败' 
    }, { status: 500 });
  }
}