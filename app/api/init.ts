import { initializeDefaultApiKey } from '@/lib/api-key-service';
import { getAllEnvSettings } from '@/lib/env-service';
import { logger } from '@/lib/logger';

/**
 * 初始化应用程序
 * 用于在应用启动时执行必要的初始化操作
 */
export async function initApplication() {
  try {
    logger.info('正在初始化应用...');
    
    // 获取环境变量中的API密钥
    const settings = await getAllEnvSettings();
    const defaultApiKey = settings.YOUTUBE_API_KEY;
    
    // 初始化默认API密钥
    if (defaultApiKey) {
      logger.info('正在初始化默认YouTube API密钥');
      await initializeDefaultApiKey(defaultApiKey);
    } else {
      logger.warn('未找到默认的YouTube API密钥，请在API密钥管理页面添加');
    }
    
    logger.info('应用初始化完成');
  } catch (error) {
    logger.error('应用初始化失败', error instanceof Error ? error.message : String(error));
  }
} 