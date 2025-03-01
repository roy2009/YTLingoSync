import { logger } from './logger';
import { setupProxy } from './proxy';
import axios, { AxiosError, AxiosRequestConfig, AxiosInstance } from 'axios';

interface ApiCallOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  useProxy?: boolean;
}

/**
 * 带有重试机制的API调用函数
 */
export async function apiCallWithRetry(
  url: string, 
  options: ApiCallOptions = {},
  axiosConfig: AxiosRequestConfig = {}
) {
  const { 
    maxRetries = 3, 
    retryDelay = 1000, 
    timeout = 10000,
    useProxy = true
  } = options;
  
  // 获取代理设置
  let http: AxiosInstance = axios.create();
  if (useProxy) {
    try {
      // 直接获取代理配置
      const { getActiveProxyConfig } = await import('./proxy');
      const proxyConfig = await getActiveProxyConfig();
      
      http = setupProxy(proxyConfig);
    } catch (error) {
      logger.error('获取代理设置失败，使用直接连接', error instanceof Error ? error.message : String(error));
    }
  }
  
  // 确保URL使用HTTPS
  if (!url.startsWith('https://')) {
    url = url.replace('http://', 'https://');
    if (!url.startsWith('https://')) {
      url = `https://${url}`;
    }
  }
  
  // 添加默认配置
  const config = {
    timeout,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    ...axiosConfig
  };
  
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await http.request({
        url,
        ...config
      });
    } catch (error: any) {
      lastError = error;
      
      // 记录错误
      logger.warn(`API调用失败 (尝试 ${attempt + 1}/${maxRetries}): ${url}`, { 
        error: error.message,
        status: error.response?.status
      });
      
      // 某些错误不需要重试
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        // 如果是4xx错误（除了429和408），不需要重试
        const status = axiosError.response.status;
        if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
          throw error;
        }
      }
      
      // 最后一次尝试失败，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  throw lastError;
}