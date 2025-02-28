import { simpleParser } from 'mailparser';
import { prisma } from './prisma';
import { logger } from './logger';
import nodemailer from 'nodemailer';
import Imap from 'imap';
import { setupProxy, getActiveProxyConfig } from './proxy';
import axios from 'axios';

// 从 HeyGen 分享 URL 中提取 YouTube 视频 ID
export async function extractYouTubeId(heygenUrl: string): Promise<string | null> {
  logger.debug(`开始从 HeyGen URL 提取 YouTube ID: ${heygenUrl}`);
  
  try {
    // 获取代理配置
    const proxyConfig = await getActiveProxyConfig();
    logger.debug(`使用代理配置: ${proxyConfig.proxyEnabled ? '已启用' : '未启用'}`);
    
    // 创建可能使用代理的axios实例
    const http = setupProxy(proxyConfig);
    
    // 抓取 HeyGen 页面
    logger.debug(`正在请求 HeyGen 页面: ${heygenUrl}`);
    const response = await http.get(heygenUrl);
    
    if (response.status !== 200) {
      logger.warn(`HeyGen 页面请求失败，状态码: ${response.status}`);
      return null;
    }
    
    logger.debug('成功获取 HeyGen 页面内容，开始解析');
    const html = response.data;
    logger.debug(`页面内容长度: ${html.length} 字符`);
    
    // 提取 YouTube URL
    const youtubeMatches = html.match(/https:\/\/www\.youtube\.com\/watch\?v=([^&"]+)/);
    if (youtubeMatches && youtubeMatches[1]) {
      logger.debug(`成功提取到 YouTube ID: ${youtubeMatches[1]}`);
      return youtubeMatches[1];
    }
    
    logger.debug('未在 HeyGen 页面中找到 YouTube ID');
    return null;
  } catch (error: unknown) {
    logger.error('从 HeyGen 页面提取 YouTube ID 失败:', String(error));
    logger.debug(`出错的 HeyGen URL: ${heygenUrl}`);
    logger.debug(`错误详情: ${error instanceof Error ? error.stack : String(error)}`);
    return null;
  }
}

// 格式化日期为 IMAP 搜索所需的格式
function formatDateForIMAP(date: Date): string {
  // IMAP 日期格式应该是: "DD-MMM-YYYY"，其中 MMM 是英文月份缩写
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // 返回格式化的日期字符串
  return `${day}-${month}-${year}`;
}

// 检查邮件并处理 HeyGen 通知
export async function checkHeyGenEmails(config: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  debug?: boolean;
  verbose?: boolean; // 新增选项，用于控制是否输出详细日志
}): Promise<{processed: number, errors: number}> {
  logger.info('开始检查 HeyGen 邮件通知', { 
    host: config.host, 
    port: config.port, 
    user: config.user,
    tls: config.tls,
    debug: config.debug || false,
    verbose: config.verbose || false, // 记录详细日志选项
    checkTime: new Date().toISOString()
  });
  
  // 验证配置有效性
  if (!config.host || !config.user || !config.password) {
    logger.error('HeyGen 邮件配置不完整', {
      hasHost: !!config.host,
      hasUser: !!config.user,
      hasPassword: !!config.password
    });
    throw new Error('邮件配置不完整，请检查设置');
  }
  
  // 从邮件内容中提取 HeyGen 分享链接
  function extractHeyGenShareUrl(content: string): string | null {
    logger.debug('开始从邮件内容中提取 HeyGen 分享链接');
    
    // 尝试直接从内容中提取所有链接
    const allLinks = content.match(/https?:\/\/[^\s"'<>()]+/g) || [];
    
    // 只保留可能的HeyGen链接
    const possibleHeygenLinks = allLinks.filter(link => 
      link.includes('heygen.com') || link.includes('share')
    );
    
    // 只有在详细模式下且有相关链接时才输出
    if (config.verbose && possibleHeygenLinks.length > 0) {
      logger.debug(`找到 ${possibleHeygenLinks.length} 个可能的HeyGen链接:`);
      possibleHeygenLinks.forEach((link, index) => {
        logger.debug(`${index+1}: ${link}`);
      });
      
      // 减少内容摘要输出，只在有HeyGen链接且为详细日志模式时才输出
      const contentPreview = content.substring(0, 500);
      logger.debug(`邮件内容摘要 (包含HeyGen链接的部分): \n${contentPreview}${content.length > 500 ? '...' : ''}`);
    } else {
      logger.debug(`邮件内容长度: ${content.length} 字符${possibleHeygenLinks.length > 0 ? `，找到 ${possibleHeygenLinks.length} 个可能的HeyGen链接` : ''}`);
    }
    
    // 增强链接提取逻辑
    const patterns = [
      /https:\/\/app\.heygen\.com\/video-translate\/share\/[^?&\s"')]+/,
      /https:\/\/app\.heygen\.com\/share\/[^\s"')]+/,
      /https:\/\/heygen\.com\/share\/[^\s"')]+/,
      /https:\/\/app\.heygen\.com\/[^\s"')]+/,
      /https:\/\/(?:www\.)?heygen\.com\/(?:app\/)?[^\s"')]+/,
      /https?:\/\/[^\s"')]+heygen[^\s"')]+/  // 捕获任何包含 heygen 的 URL
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        logger.debug(`成功使用模式 ${pattern} 提取到 HeyGen 分享链接: ${matches[0]}`);
        
        // 输出匹配上下文
        if (config.verbose) {
          const matchIndex = content.indexOf(matches[0]);
          const contextStart = Math.max(0, matchIndex - 150);
          const contextEnd = Math.min(content.length, matchIndex + matches[0].length + 150);
          const context = content.substring(contextStart, contextEnd);
          
          logger.debug(`HeyGen 链接上下文 (±150字符): \n...${context}...`);
        }
        
        // 尝试提取视频翻译分享链接中的ID
        const videoTranslateMatch = matches[0].match(/\/video-translate\/share\/([^?&\s"')]+)/);
        if (videoTranslateMatch && videoTranslateMatch[1]) {
          const shareId = videoTranslateMatch[1];
          logger.debug(`从视频翻译分享链接中提取到ID: ${shareId}`);
        }

        return matches[0];
      }
    }
    
    logger.debug('尝试了多种模式但未能找到 HeyGen 分享链接');
    return null;
  }
  
  return new Promise((resolve, reject) => {
    // 创建 IMAP 连接
    logger.debug('正在创建 IMAP 连接');
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    let processed = 0;
    let errors = 0;
    
    // 定义消息处理函数参数类型
    interface MessageBuffer {
      buffer: Buffer;
      seqno: number;
      size: number;
    }
    
    // 添加这个接口定义
    interface EnhancedMessageBuffer extends MessageBuffer {
      date?: Date;
    }
    
    function processMessage(msg: Buffer) {
      logger.debug('开始处理邮件消息');
      return new Promise((resolve) => {
        const parser = simpleParser(msg);
        parser.then(async (parsed: any) => {
          try {
            logger.debug(`处理邮件: ${parsed.subject}`, { 
              from: parsed.from?.text,
              date: parsed.date,
              messageId: parsed.messageId
            });
            
            // 调试模式下输出邮件详细内容
            if (config.debug) {
              // 输出邮件基本信息
              logger.debug('=================== 邮件调试信息开始 ===================');
              logger.debug(`邮件标题: ${parsed.subject}`);
              logger.debug(`发件人: ${parsed.from?.text}`);
              logger.debug(`收件人: ${parsed.to?.text}`);
              logger.debug(`日期: ${parsed.date?.toISOString()}`);
              
              // 输出邮件文本内容
              if (parsed.text) {
                // 超级详细模式下输出完整内容
                if (config.verbose) {
                  //logger.debug(`--------- 邮件完整文本内容 ---------:\n${parsed.text}`);
                } else {
                  // 普通调试模式下只显示前500字符
                  const textPreview = parsed.text.substring(0, 500);
                  //logger.debug(`邮件文本内容 (前500字符): \n${textPreview}${parsed.text.length > 500 ? '...' : ''}`);
                }
                
                // 从文本内容中直接提取所有 URL
                const textUrls = parsed.text.match(/https?:\/\/[^\s"'<>()]+/g) || [];
                // 筛选可能是 HeyGen 链接的 URL
                const potentialHeygenUrls = textUrls.filter(url => 
                  url.includes('heygen.com') && url.includes('share')
                );
                
                // 只有在有HeyGen相关链接时才输出
                if (potentialHeygenUrls.length > 0 && config.debug) {
                  logger.debug(`----- 从文本中找到的潜在 HeyGen 链接 (${potentialHeygenUrls.length}个) -----:`);
                  potentialHeygenUrls.forEach((url: string, index: number) => {
                    logger.debug(`${index+1}: ${url}`);
                  });
                }
              }
              
              logger.debug('=================== 邮件调试信息结束 ===================');
            }
            
            // 是否是来自HeyGen的邮件
            const isFromHeyGen = parsed.from?.text?.includes('heygen.com') || 
                                parsed.subject?.includes('HeyGen') ||
                                parsed.subject?.includes('视频翻译');
            
            if (!isFromHeyGen) {
              logger.debug('跳过非HeyGen邮件', {
                from: parsed.from?.text,
                subject: parsed.subject
              });
              return resolve(false); // 不是HeyGen邮件，标记为已处理但无操作
            }
            
            // 提取并存储所有可能的 HeyGen 链接
            let potentialHeygenUrls: string[] = [];
            
            // 从文本内容中提取链接
            if (parsed.text) {
              const textUrls = parsed.text.match(/https?:\/\/[^\s"'<>()]+/g) || [];
              // 筛选精确匹配的 HeyGen 分享链接
              potentialHeygenUrls = textUrls.filter(url => 
                url.includes('heygen.com') && url.includes('/share/')
              );
              
              // 输出调试信息
              if (config.debug && potentialHeygenUrls.length > 0) {
                logger.debug(`----- 从文本中找到的 HeyGen 分享链接 (${potentialHeygenUrls.length}个) -----:`);
                potentialHeygenUrls.forEach((url: string, index: number) => {
                  logger.debug(`${index+1}: ${url}`);
                });
              }
            }
            
            // 如果已经找到 HeyGen 分享链接，直接使用第一个
            if (potentialHeygenUrls.length > 0) {
              // 使用第一个找到的链接
              const heygenUrl = potentialHeygenUrls[0];
              logger.info(`直接从邮件文本中提取到 HeyGen 分享链接: ${heygenUrl}`);
              
              // 从HeyGen页面提取YouTube ID
              const youtubeId = await extractYouTubeId(heygenUrl);
              if (!youtubeId) {
                logger.warn(`无法从HeyGen链接提取YouTube ID: ${heygenUrl}`);
                return resolve(false);
              }
              
              // 尝试提取视频翻译分享链接中的ID
              let embedsHeygenUrl
              const videoTranslateMatch = heygenUrl.match(/\/video-translate\/share\/([^?&\s"')]+)/);
              if (videoTranslateMatch && videoTranslateMatch[1]) {
                const shareId = videoTranslateMatch[1];
                embedsHeygenUrl = "https://app.heygen.com/embeds/" + shareId
                logger.debug(`从视频翻译分享链接中提取到ID: ${embedsHeygenUrl}`);
              }

              // TODO：
              // https://app.heygen.com/videos/f5d5dba57cb1474299caf43165e58585
              // https://app.heygen.com/embeds/f5d5dba57cb1474299caf43165e58585
              //<iframe width="560" height="315" src="https://app.heygen.com/embeds/f5d5dba57cb1474299caf43165e58585" title="HeyGen video player" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
              // 查找对应的翻译记录
              const video = await prisma.video.findFirst({
                where: {
                  youtubeId: youtubeId
                }
              });
              logger.info(`从HeyGen链接提取到YouTube ID: ${youtubeId}`);
              
            
              if (!video) {
                logger.warn(`未找到匹配的翻译记录，YouTube ID: ${youtubeId}`);
                return resolve(false);
              }
              
              logger.debug(`找到匹配的翻译记录: ${video.id}`, {
                videoId: video.id,
                translationStatus: video.translationStatus,
                createdAt: video.createdAt
              });
              
              // 更新翻译状态
              await prisma.video.update({
                where: { id: video.id },
                data: {
                  translationStatus: 'completed',
                  translatedVideoUrl: embedsHeygenUrl,
                  updatedAt: new Date()
                }
              });
              
              // 在处理邮件成功后增加更详细的日志
              logger.info(`成功从邮件中提取并处理 HeyGen 链接`, {
                subject: parsed.subject,
                from: parsed.from?.text,
                heygenUrl,
                youtubeId,
                videoId: video.id
              });
              
              processed++;
              return resolve(true); // 成功处理
            }
            else {
              // 没必要处理邮件主体内容
              logger.debug('邮件内容为空，跳过处理');
              return resolve(false);
            }
            
          } catch (err: unknown) {
            logger.error('处理邮件时出错:', err instanceof Error ? err.message : String(err));
            logger.debug(`处理邮件出错详情: ${err instanceof Error ? err.stack : String(err)}`, {
              subject: parsed.subject,
              messageId: parsed.messageId
            });
            errors++;
            return resolve(false); // 处理出错
          }
        }).catch((err: unknown) => {
          logger.error('解析邮件失败:', err instanceof Error ? err.message : String(err));
          logger.debug(`解析邮件失败详情: ${err instanceof Error ? err.stack : String(err)}`);
          errors++;
          resolve(false);
        });
      });
    }
    
    // 修改邮件获取和处理流程
    async function processAllMessages(messages: EnhancedMessageBuffer[]) {
      logger.info(`开始处理 ${messages.length} 封邮件`);
      let processedCount = 0;
      
      // 串行处理每封邮件，确保完成一封再处理下一封
      for (let i = 0; i < messages.length; i++) {
        const buffer = messages[i];
        logger.debug(`处理第 ${i+1}/${messages.length} 封邮件`);
        
        try {
          const result = await processMessage(buffer.buffer);
          if (result) {
            processedCount++;
            logger.debug(`成功处理第 ${i+1} 封邮件`);
          } else {
            logger.debug(`第 ${i+1} 封邮件处理完成，无需操作`);
          }
        } catch (err: unknown) {
          logger.error(`处理第 ${i+1} 封邮件时出错:`, String(err));
          if (config.verbose) {
            // 在详细模式下尝试输出更多错误信息
            logger.debug(`处理邮件出错详情: ${err instanceof Error ? err.stack : 'Unknown error'}`);
          }
          errors++;
        }
      }
      
      logger.info(`所有邮件处理完成，成功处理 ${processedCount} 封，遇到 ${errors} 个错误`);
      processed = processedCount;
    }
    
    // 收集所有邮件内容
    let allMessages: EnhancedMessageBuffer[] = [];
    
    imap.once('ready', () => {
      logger.debug('IMAP 连接就绪，准备打开收件箱');
      imap.openBox('INBOX', false, (err: Error | null, box: any) => {
        if (err) {
          logger.error('打开收件箱失败:', err);
          logger.debug(`打开收件箱失败详情: ${err instanceof Error ? err.stack : String(err)}`);
          return reject(err);
        }
        
        logger.debug('成功打开收件箱，开始搜索邮件');
        
        // 搜索条件：无论是调试模式还是正常模式，都只搜索未读邮件
        let searchCriteria = ['UNSEEN'];
        logger.debug(`${config.debug ? '调试' : '正常'}模式：搜索未读邮件`);
        
        // 在调试模式下通知用户
        if (config.debug) {
          logger.info('调试模式：不会将邮件标记为已读，以便重复测试');
        }
        
        imap.search(searchCriteria, (err: Error | null, results: number[]) => {
          if (err) {
            logger.error('搜索邮件失败:', err);
            logger.debug(`搜索邮件失败详情: ${err instanceof Error ? err.stack : String(err)}`);
            return reject(err);
          }
          
          if (results.length === 0) {
            logger.info('未发现邮件');
            imap.end();
            return resolve({ processed: 0, errors: 0 });
          }
          
          // 在调试模式下，限制结果数量
          if (config.debug && results.length > 30) {
            // 按序号排序（通常最新的邮件有较大的序号）
            results.sort((a, b) => b - a);
            const originalCount = results.length;
            results = results.slice(0, 30);
            logger.debug(`调试模式：限制处理最近的30封邮件（总共 ${originalCount} 封）`);
          }
          
          logger.info(`发现 ${results.length} 封邮件${config.debug ? '（调试模式）' : ''}`, { 
            count: results.length,
            mode: config.debug ? 'debug' : 'normal',
            messageIds: results.join(', ')
          });
          
          // 获取邮件时添加邮件属性
          const f = imap.fetch(results, { 
            bodies: '',
            struct: true,
            envelope: true 
          });
          
          f.on('message', (msg: any, seqno: number) => {
            logger.debug(`开始获取邮件正文，序号: ${seqno}`);
            let chunks: Buffer[] = [];
            
            msg.once('attributes', (attrs: any) => {
              const uid = attrs.uid;
              const date = attrs.date;
              logger.debug(`邮件信息 - UID: ${uid}, 日期: ${date}, 序号: ${seqno}`);
              
              // 只在非调试模式下标记为已读
              if (!config.debug) {
                imap.addFlags(uid, ['\\Seen'], (err: Error | null) => {
                  if (err) {
                    logger.error('标记邮件为已读失败:', err);
                    logger.debug(`标记邮件为已读失败详情: ${err instanceof Error ? err.stack : String(err)}`);
                  } else {
                    logger.debug(`邮件已标记为已读，UID: ${uid}`);
                  }
                });
              } else {
                logger.debug(`调试模式：邮件 UID: ${uid} 保持未读状态`);
              }
            });
            
            msg.on('body', (stream: any, info: any) => {
              logger.debug(`接收邮件主体数据，序号: ${seqno}`);
              
              stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
              
              stream.once('end', () => {
                const size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                logger.debug(`邮件主体接收完成，序号: ${seqno}，大小: ${size} 字节`);
                const buffer = Buffer.concat(chunks);
                
                // 修改这里，保存邮件日期
                allMessages.push({
                  buffer,
                  seqno,
                  size,
                  date: msg.attributes?.date // 保存邮件日期
                });
              });
            });
          });
          
          f.once('error', (err: Error) => {
            logger.error('获取邮件失败:', err);
            logger.debug(`获取邮件失败详情: ${err instanceof Error ? err.stack : String(err)}`);
            reject(err);
          });
          
          // 所有邮件获取完成后的处理
          f.once('end', () => {
            logger.info(`邮件获取完成，共 ${allMessages.length} 封邮件待处理`);
            
            // 异步处理所有邮件，完成后关闭连接
            processAllMessages(allMessages)
              .then(() => {
                logger.info('所有邮件处理完成', { processed, errors });
                imap.end();
                resolve({ processed, errors });
              })
              .catch(err => {
                logger.error('处理邮件集合时出错:', err);
                imap.end();
                reject(err);
              });
          });
        });
      });
    });
    
    imap.once('error', (err: Error) => {
      logger.error('IMAP 连接错误:', err);
      logger.debug(`IMAP 连接错误详情: ${err instanceof Error ? err.stack : String(err)}`);
      reject(err);
    });
    
    imap.once('end', () => {
      logger.info('IMAP 连接已关闭');
    });
    
    logger.debug('开始连接到 IMAP 服务器');
    imap.connect();
  });
}