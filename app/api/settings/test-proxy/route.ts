import { NextResponse } from 'next/server';
import axios from 'axios';
import { setupProxy } from '@/lib/proxy';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { proxyEnabled, proxyUrl, proxyUsername, proxyPassword } = await request.json();
    
    if (!proxyEnabled) {
      return NextResponse.json(
        { error: '代理未启用，无需测试' },
        { status: 400 }
      );
    }
    
    if (!proxyUrl) {
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
      } catch (geoError) {
        console.warn('无法获取IP地理位置:', geoError.message);
      }
      
      return NextResponse.json({
        success: true,
        ip: response.data.ip,
        location: location.trim()
      });
    } catch (error) {
      logger.error('代理连接测试失败', error, 'proxy-test');
      
      let errorMessage = '代理连接失败';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到代理服务器，连接被拒绝';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '连接超时，请检查代理地址是否正确';
      } else if (error.response && error.response.status === 407) {
        errorMessage = '代理认证失败，请检查用户名和密码';
      } else if (error.message) {
        errorMessage = `代理错误: ${error.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('处理代理测试请求失败', error, 'proxy-test');
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 }
    );
  }
} 