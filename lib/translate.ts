import axios from 'axios';
import { setupProxy } from './proxy';
import { logger } from './logger';
import { submitToHeygen } from '@/lib/heygen';
import { getLanguageCode } from './language-mapper';
import { PrismaClient } from '@prisma/client';
import { getAllEnvSettings } from './env-service';

const prismaClient = new PrismaClient();

// 添加类型定义
interface TranslationOptions {
  startTime?: number | null;
  endTime?: number | null;
  targetLanguage?: string;
}

/**
 * 使用免费Google翻译API将文本翻译为中文
 * @param text 要翻译的文本
 * @param targetLang 目标语言，默认中文
 * @returns 翻译后的文本
 */
export async function translateText(text: string, targetLang: string = 'Chinese'): Promise<string> {
  try {
    if (isMostlyChinese(text)) {
      logger.debug('文本已经是中文，跳过翻译:', text.substring(0, 30));
      return text;
    }
    
    logger.debug(`开始翻译文本: "${text.substring(0, 30)}..."，目标语言: ${targetLang}`);
    
    // 获取设置
    const settingsObj = await getAllEnvSettings();
    
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    logger.debug(`使用翻译服务: ${translationService}`);
    
    if (translationService === 'none') {
      logger.debug('翻译服务未启用，返回原文');
      return text;
    }
    
    // 获取代理配置
    const proxyConfig = {
      proxyEnabled: settingsObj.PROXY_ENABLED === 'true',
      proxyUrl: settingsObj.PROXY_URL,
      proxyUsername: settingsObj.PROXY_USERNAME,
      proxyPassword: settingsObj.PROXY_PASSWORD,
      verifySSL: settingsObj.VERIFY_SSL !== 'false'
    };
    
    const http = setupProxy(proxyConfig);
    
    // 使用Google免费翻译API
    try {
      logger.debug('正在调用谷歌免费翻译API...');
      // 将语言名称转换为语言代码
      const langCode = getLanguageCode(targetLang);
      logger.debug(`将语言名称 ${targetLang} 转换为语言代码 ${langCode}`);
      
      const response = await http.get(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`
      );
      
      logger.debug(`翻译API响应: ${JSON.stringify(response.data).substring(0, 200)}...`);
      
      // 解析Google翻译响应
      if (response.data && Array.isArray(response.data[0])) {
        // 提取翻译结果
        let translatedText = '';
        response.data[0].forEach(item => {
          if (item[0]) translatedText += item[0];
        });
        
        if (translatedText === text) {
          logger.warn('翻译结果与原文相同，可能翻译失败');
        } else {
          logger.debug(`翻译成功: "${text.substring(0, 30)}..." => "${translatedText.substring(0, 30)}..."`);
        }
        return translatedText;
      } else {
        logger.warn('谷歌翻译返回数据格式异常:', JSON.stringify(response.data).substring(0, 200));
      }
    } catch (err) {
      logger.error('谷歌免费翻译失败:', err);
    }
    
    // 返回原文
    logger.warn('翻译失败，返回原文');
    return text;
  } catch (error) {
    logger.error('翻译服务整体失败:', error);
    return text;
  }
}

/**
 * 检查文本是否主要由中文字符组成
 */
function isMostlyChinese(text: string): boolean {
  // 匹配中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/g;
  const chineseMatches = text.match(chineseRegex);
  
  if (!chineseMatches) return false;
  
  // 如果中文字符占比超过50%，认为主要是中文
  return chineseMatches.length / text.length > 0.5;
}

/**
 * 对长文本进行分段翻译
 * @param text 要翻译的长文本
 * @param targetLang 目标语言
 * @returns 翻译后的文本
 */
export async function translateLongText(text: string, targetLang: string = 'Chinese'): Promise<string> {
  if (!text || text.trim() === '') return '';
  
  // 如果文本很短，直接翻译
  if (text.length < 1000) {
    return await translateText(text, targetLang);
  }
  
  // 将文本按段落分割
  const paragraphs = text.split(/\r?\n\r?\n/);
  
  // 每次翻译最多5个段落，以控制API调用量
  const batches = [];
  for (let i = 0; i < paragraphs.length; i += 5) {
    batches.push(paragraphs.slice(i, i + 5));
  }
  
  // 按批次翻译
  const translatedBatches = [];
  for (const batch of batches) {
    // 只翻译非空段落
    const translatedBatch = await Promise.all(
      batch.map(p => p.trim() ? translateText(p, targetLang) : p)
    );
    translatedBatches.push(...translatedBatch);
    
    // 在批次之间添加小延迟，避免API限制
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 将翻译后的段落重新组合
  return translatedBatches.join('\n\n');
}

/**
 * 提交视频到翻译服务
 */
export async function submitVideoForTranslation(videoId: string, options: TranslationOptions = {}) {
  // 获取视频信息
  const video = await prismaClient.video.findUnique({
    where: { id: videoId }
  });
  
  if (!video) {
    throw new Error(`视频不存在: ${videoId}`);
  }
  
  // 检查视频长度
  if (video.duration && video.duration >= 1800) { // 30分钟 = 1800秒
    logger.warn(`视频时长超过30分钟，暂不处理`, { videoId, duration: video.duration });
    throw new Error('暂时仅支持30分钟以内的视频翻译');
  }
  
  // 暂时禁用分段功能
  if (options.startTime || options.endTime) {
    logger.warn(`暂不支持视频分段翻译`, { videoId });
    throw new Error('暂时不支持视频分段翻译');
  }
  
  // 确保传递正确的参数：YouTube ID 和视频 ID (字符串)
  const success = await submitToHeygen(video.id);
  if (!success) {
    throw new Error('提交翻译任务失败');
  }
  
  return 'submitted';
}