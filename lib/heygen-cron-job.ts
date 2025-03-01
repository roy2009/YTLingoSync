import { checkHeyGenEmails } from './heygen-email-service';
import { prisma } from './prisma';
import { logger } from './logger';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';
import nodemailer from 'nodemailer';
import * as nodeCron from 'node-cron';
import { getAllEnvSettings } from './env-service';

let heygenCheckJob: nodeCron.ScheduledTask | null = null;
// 添加任务锁变量，防止任务重叠执行
let isHeygenCheckRunning = false;
// 添加默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5分钟

// 获取下一次执行时间
function getNextExecutionTime(): Date {
  // 默认为5分钟后
  return new Date(Date.now() + 5 * 60 * 1000);
}

// 在 startHeyGenEmailCheckJob 函数中添加状态跟踪
export async function startHeyGenEmailCheckJob() {
  try {
    // 停止现有任务（如果有）
    if (heygenCheckJob) {
      logger.debug('正在停止现有的HeyGen邮件检查任务');
      heygenCheckJob.stop();
      heygenCheckJob = null;
    }
    
    // 获取环境设置
    const settingsObj = await getAllEnvSettings();
    
    // 检查并输出关键配置信息，方便排错
    logger.debug(`HeyGen邮件检查配置: HEYGEN_EMAIL_CHECK_ENABLED=${settingsObj.HEYGEN_EMAIL_CHECK_ENABLED || '未设置'}`);
    
    // 检查是否启用了 HeyGen 邮件检查
    const enabled = settingsObj.HEYGEN_EMAIL_CHECK_ENABLED === 'true';
    if (!enabled) {
      logger.warn('HeyGen 邮件检查已禁用，不启动任务。请设置环境变量 HEYGEN_EMAIL_CHECK_ENABLED=true 启用此功能');
      return false;
    }
    
    // 获取检查间隔（默认每5分钟）
    let checkInterval = settingsObj.HEYGEN_EMAIL_CHECK_INTERVAL || '*/5 * * * *';
    logger.debug(`HeyGen邮件检查间隔: ${checkInterval}`);
    
    // 验证cron表达式是否有效
    if (!nodeCron.validate(checkInterval)) {
      logger.error(`无效的cron表达式: ${checkInterval}，使用默认值: */5 * * * *`);
      checkInterval = '*/5 * * * *';
    }
    
    // 创建 Cron 任务
    try {
      logger.debug(`正在创建HeyGen邮件检查定时任务，cron表达式: ${checkInterval}`);
      heygenCheckJob = nodeCron.schedule(checkInterval, async () => {
        logger.debug(`触发HeyGen邮件检查定时任务，当前时间: ${new Date().toLocaleString()}`);
        
        // 检查任务是否已在运行，防止重叠执行
        if (isHeygenCheckRunning) {
          logger.warn('上一次 HeyGen 邮件检查任务尚未完成，跳过本次执行');
          return;
        }
        
        // 设置任务超时计时器
        let timeoutId: NodeJS.Timeout | null = null;
        
        try {
          // 标记任务开始运行
          isHeygenCheckRunning = true;
          
          // 设置任务超时保护
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('HeyGen 邮件检查任务执行超时'));
            }, DEFAULT_TIMEOUT);
          });
          
          logger.debug('执行定期 HeyGen 邮件检查');
          
          // 更新任务状态为运行中
          await updateTaskStatus(TASK_NAMES.HEYGEN_EMAIL_CHECK, {
            status: 'running',
            message: '正在检查 HeyGen 邮件'
          });
          
          // 获取邮箱配置
          const emailConfig = {
            user: settingsObj.HEYGEN_EMAIL_USER || '',
            password: settingsObj.HEYGEN_EMAIL_PASSWORD || '',
            host: settingsObj.HEYGEN_EMAIL_HOST || '',
            port: parseInt(settingsObj.HEYGEN_EMAIL_PORT || '993'),
            tls: settingsObj.HEYGEN_EMAIL_TLS !== 'false'
          };
          
          // 记录关键配置(隐藏密码)
          logger.debug(`邮箱配置: ${emailConfig.user}@${emailConfig.host}:${emailConfig.port}, TLS: ${emailConfig.tls}`);
          
          // 执行邮件检查，添加超时保护
          const result = await Promise.race([
            checkHeyGenEmails(emailConfig),
            timeoutPromise
          ]) as { processed?: number } | undefined;
          
          // 清除超时计时器
          if (timeoutId) clearTimeout(timeoutId);
          
          const emailCount = result?.processed || 0;
          const processedCount = result?.processed || 0;
          
          // 计算下次运行时间
          const nextRunTime = getNextExecutionTime();
          
          // 更新任务状态为成功
          await updateTaskStatus(TASK_NAMES.HEYGEN_EMAIL_CHECK, {
            lastRun: new Date(),
            nextRun: nextRunTime,
            status: 'idle',
            message: `已检查 ${emailCount} 封邮件，处理了 ${processedCount} 个视频`
          });
          
          logger.debug(`HeyGen 邮件检查完成: 检查了 ${emailCount} 封邮件，处理了 ${processedCount} 个视频`);
        } catch (error: unknown) {
          // 清除超时计时器
          if (timeoutId) clearTimeout(timeoutId);
          
          // 记录错误
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('执行 HeyGen 邮件检查失败:', errorMessage);
          
          // 更新任务状态为失败
          await updateTaskStatus(
            TASK_NAMES.HEYGEN_EMAIL_CHECK, 
            {
              status: 'failed',
              lastRun: new Date(),
              nextRun: getNextExecutionTime(),
              message: errorMessage
            }
          );
        } finally {
          // 无论成功还是失败，都标记任务已完成
          isHeygenCheckRunning = false;
        }
      }, {
        // 添加cron选项，确保任务被正确调度
        scheduled: true,
        timezone: "Asia/Shanghai" // 使用中国时区
      });
      
      logger.debug('HeyGen邮件检查定时任务创建成功');
    } catch (cronError) {
      logger.error('创建HeyGen邮件检查定时任务失败:', cronError instanceof Error ? cronError.message : String(cronError));
      return false;
    }
    
    // 更新任务状态为空闲
    await updateTaskStatus(
      TASK_NAMES.HEYGEN_EMAIL_CHECK, 
      {
        status: 'idle',
        message: '等待下一次执行',
        nextRun: getNextExecutionTime()
      }
    );
    
    // 启动任务
    logger.debug('正在启动HeyGen邮件检查定时任务');
    heygenCheckJob.start();
    
    // 获取下一次实际执行时间（如果node-cron支持）
    try {
      // 使用简单估算，避免nextDate()方法可能不兼容的问题
      const nextRunTime = getNextExecutionTime();
      logger.debug(`下一次 HeyGen 邮件检查预计在 ${nextRunTime.toLocaleString()} 执行`);
    } catch (e) {
      logger.error('计算下一次执行时间失败:', e instanceof Error ? e.message : String(e));
    }
    
    // 立即执行一次检查，确保功能正常
    logger.debug('正在执行HeyGen邮件检查的初始检查...');
    try {
      const emailConfig = {
        user: settingsObj.HEYGEN_EMAIL_USER || '',
        password: settingsObj.HEYGEN_EMAIL_PASSWORD || '',
        host: settingsObj.HEYGEN_EMAIL_HOST || '',
        port: parseInt(settingsObj.HEYGEN_EMAIL_PORT || '993'),
        tls: settingsObj.HEYGEN_EMAIL_TLS !== 'false'
      };
      
      // 隐藏密码后记录配置
      logger.debug(`初始检查使用邮箱: ${emailConfig.user}@${emailConfig.host}:${emailConfig.port}`);
      
      const result = await checkHeyGenEmails(emailConfig);
      logger.debug(`初始检查完成，处理了 ${result?.processed || 0} 封邮件`);
    } catch (e) {
      logger.error('初始HeyGen邮件检查失败:', e instanceof Error ? e.message : String(e));
    }
    
    logger.debug(`HeyGen 邮件检查任务启动成功，使用cron表达式: ${checkInterval}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('启动 HeyGen 邮件检查任务失败:', errorMessage);
    logger.error('错误详情:', error instanceof Error ? error.stack : String(error));
    return false;
  }
}

export function stopHeyGenEmailCheckJob() {
  if (heygenCheckJob) {
    logger.debug('正在停止HeyGen邮件检查任务');
    heygenCheckJob.stop();
    heygenCheckJob = null;
    logger.debug('HeyGen 邮件检查任务已停止');
    return true;
  }
  logger.debug('没有运行中的HeyGen邮件检查任务需要停止');
  return false;
}