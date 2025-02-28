import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { checkHeyGenEmails } from '@/lib/heygen-email-service';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 获取调试模式参数
    const body = await request.json().catch(() => ({}));
    const debug = body.debug || false;
    
    logger.info(`开始${debug ? '调试模式' : ''}检查 HeyGen 邮件`, { 
      debug,
      requestTime: new Date().toISOString()
    });
    
    // 从数据库获取设置
    const settings = await prisma.setting.findMany({
      where: {
        id: {
          in: [
            'heygen_email_host',
            'heygen_email_port',
            'heygen_email_user',
            'heygen_email_password',
            'heygen_email_tls'
          ]
        }
      }
    });
    
    logger.debug('获取到 HeyGen 邮件设置', { settingsCount: settings.length });
    
    // 转换为配置对象
    const config = {
      host: '',
      port: 993,
      user: '',
      password: '',
      tls: true,
      debug: debug // 传递调试模式参数
    };
    
    // 设置值
    settings.forEach(setting => {
      switch (setting.id) {
        case 'heygen_email_host':
          config.host = setting.value;
          break;
        case 'heygen_email_port':
          config.port = parseInt(setting.value, 10) || 993;
          break;
        case 'heygen_email_user':
          config.user = setting.value;
          break;
        case 'heygen_email_password':
          config.password = setting.value;
          break;
        case 'heygen_email_tls':
          config.tls = setting.value === 'true';
          break;
      }
    });
    
    // 验证配置
    if (!config.host || !config.user || !config.password) {
      logger.error('HeyGen 邮件设置不完整', {
        hasHost: !!config.host,
        hasUser: !!config.user, 
        hasPassword: !!config.password
      });
      
      return NextResponse.json(
        { 
          error: 'HeyGen 邮件设置不完整',
          message: '请检查并完成邮件服务器、用户名和密码设置'
        },
        { status: 400 }
      );
    }
    
    // 记录操作日志
    logger.info(`手动${debug ? '调试模式' : ''}检查 HeyGen 邮件`, {
      host: config.host,
      user: config.user,
      debug: debug
    });
    
    // 执行邮件检查
    const result = await checkHeyGenEmails(config);
    
    // 返回结果
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `${debug ? '调试模式' : '正常模式'}检查完成，处理了 ${result.processed} 封邮件，遇到 ${result.errors} 个错误`
    });
  } catch (error) {
    // 记录错误
    logger.error('手动检查 HeyGen 邮件失败:', error instanceof Error ? error.message : String(error));
    logger.debug(`错误详情: ${error instanceof Error ? error.stack : '未知错误'}`);
    
    // 返回错误信息
    return NextResponse.json(
      { 
        error: '检查 HeyGen 邮件失败',
        message: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 