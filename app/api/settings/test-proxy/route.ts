import { NextResponse } from 'next/server';
import axios from 'axios';
import { setupProxy } from '@/lib/proxy';
import { logger } from '@/lib/logger';
import { updateEnvSettings, getEnvSetting } from '@/lib/env-service';

export async function POST(request: Request) {
  try {
    const { proxyEnabled, proxyUrl, proxyUsername, proxyPassword } = await request.json();
    
    // 更新环境变量
    await updateEnvSettings({
      PROXY_ENABLED: proxyEnabled.toString(),
      PROXY_URL: proxyUrl || '',
      PROXY_USERNAME: proxyUsername || '',
      PROXY_PASSWORD: proxyPassword || ''
    });
    
    // 获取更新后的设置
    const currentProxyEnabled = getEnvSetting('PROXY_ENABLED') === 'true';
    const currentProxyUrl = getEnvSetting('PROXY_URL');
    
    if (!currentProxyEnabled) {
      return NextResponse.json(
        { error: '代理未启用，无需测试' },
        { status: 400 }
      );
    }
    
    if (!currentProxyUrl) {
      return NextResponse.json(
        { error: '代理URL不能为空' },
        { status: 400 }
      );
    }
    
    try {
      // 配置代理
      const axiosInstance = setupProxy({
        proxyEnabled,
        proxyUrl,
        proxyUsername,
        proxyPassword
      });
      
      // 请求一个返回IP地址的服务
      const response = await axiosInstance.get('https://api.ipify.org?format=json', {
        timeout: 10000 // 10秒超时
      });
      
      // 尝试获取IP所在位置
      let location = '';
      try {
        const geoResponse = await axiosInstance.get(`https://ipapi.co/${response.data.ip}/json/`, {
          timeout: 5000
        });
        if (geoResponse.data && geoResponse.data.country_name) {
          location = `${geoResponse.data.city || ''} ${geoResponse.data.country_name}`;
        }
      } catch (geoError: unknown) {
        console.warn('无法获取IP地理位置:', geoError instanceof Error ? geoError.message : String(geoError));
      }
      
      return NextResponse.json({
        success: true,
        ip: response.data.ip,
        location: location.trim()
      });
    } catch (error) {
      logger.error('代理连接测试失败', error instanceof Error ? error.message : String(error), 'proxy-test');
      
      let errorMessage = '代理连接失败';
      const err = error as any; // 类型断言
      if (err.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到代理服务器，连接被拒绝';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = '连接超时，请检查代理地址是否正确';
      } else if (err.response && err.response.status === 407) {
        errorMessage = '代理认证失败，请检查用户名和密码';
      } else if (err.message) {
        errorMessage = `代理错误: ${err.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('处理代理测试请求失败', error instanceof Error ? error.message : String(error), 'proxy-test');
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 }
    );
  }
}