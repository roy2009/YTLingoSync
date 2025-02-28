import { CronJob } from 'cron';
import { checkHeyGenEmails } from './heygen-email-service';
import { prisma } from './prisma';
import { logger } from './logger';
import { updateTaskStatus, TASK_NAMES } from './task-status-service';
import { CronTime } from 'cron';

// 在 startHeyGenEmailCheckJob 函数中添加状态跟踪
export async function startHeyGenEmailCheckJob() {
  try {
    // 停止现有任务（如果有）
    if (heygenCheckJob) {
      heygenCheckJob.stop();
    }
    
    // 获取邮箱配置
    const settings = await prisma.setting.findMany({
      where: {
        id: {
          in: ['EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_TLS', 'HEYGEN_CHECK_INTERVAL']
        }
      }
    });
    
    // 转换为配置对象
    const config = settings.reduce((acc, setting) => {
      acc[setting.id] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    // 验证必要配置
    const requiredKeys = ['EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_HOST', 'EMAIL_PORT'];
    const missingKeys = requiredKeys.filter(key => !config[key]);
    
    if (missingKeys.length > 0) {
      logger.warn('无法启动 HeyGen 邮件检查任务，缺少必要配置', { missingKeys });
      return;
    }
    
    // 读取检查间隔（默认每30分钟）
    const checkInterval = config.HEYGEN_CHECK_INTERVAL || '*/30 * * * *'; // 默认每30分钟
    
    logger.info(`启动 HeyGen 邮件检查任务，间隔: ${checkInterval}`);
    
    // 创建 Cron 任务
    heygenCheckJob = new CronJob(checkInterval, async () => {
      try {
        logger.info('执行定期 HeyGen 邮件检查');
        
        // 更新任务状态为运行中
        await updateTaskStatus(TASK_NAMES.HEYGEN_EMAIL_CHECK, 'running');
        
        const result = await checkHeyGenEmails({
          user: config.EMAIL_USER,
          password: config.EMAIL_PASSWORD,
          host: config.EMAIL_HOST,
          port: parseInt(config.EMAIL_PORT || '993'),
          tls: config.EMAIL_TLS !== 'false'
        });
        
        logger.info('HeyGen 邮件检查完成', result);
        
        // 计算下次运行时间
        const nextRunTime = heygenCheckJob.nextDate().toDate();
        
        // 更新任务状态为成功
        await updateTaskStatus(TASK_NAMES.HEYGEN_EMAIL_CHECK, 'success', nextRunTime);
      } catch (error) {
        logger.error('执行 HeyGen 邮件检查失败:', error);
        
        // 更新任务状态为失败
        await updateTaskStatus(
          TASK_NAMES.HEYGEN_EMAIL_CHECK, 
          'failed', 
          heygenCheckJob.nextDate().toDate(),
          error instanceof Error ? error.message : String(error)
        );
      }
    });
    
    // 启动任务前，先更新状态为空闲，并设置下次运行时间
    await updateTaskStatus(
      TASK_NAMES.HEYGEN_EMAIL_CHECK, 
      'idle', 
      new Date(heygenCheckJob.nextDate())
    );
    
    // 启动任务
    heygenCheckJob.start();
    
    return true;
  } catch (error) {
    logger.error('启动 HeyGen 邮件检查任务失败:', error);
    return false;
  }
}

// 停止任务
export function stopHeyGenEmailCheckJob() {
  if (heygenCheckJob) {
    heygenCheckJob.stop();
    heygenCheckJob = null;
    logger.info('HeyGen 邮件检查任务已停止');
    return true;
  }
  return false;
}