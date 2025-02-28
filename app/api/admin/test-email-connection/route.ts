import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { host, port, user, password, tls = true } = await request.json();
    
    // 验证必要参数
    if (!host || !port || !user || !password) {
      return NextResponse.json({
        success: false,
        message: '请提供所有必要的连接参数'
      }, { status: 400 });
    }
    
    logger.info('测试邮件服务器连接', { host, port, user, tls });
    
    // 创建测试连接
    return new Promise((resolve) => {
      const imap = new Imap({
        user,
        password,
        host,
        port,
        tls,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000 // 10秒连接超时
      });
      
      let connectionResult = {
        success: false,
        message: '',
        details: {}
      };
      
      imap.once('ready', () => {
        logger.info('邮件服务器连接成功', { host, user });
        connectionResult = {
          success: true,
          message: '连接成功！邮件服务器设置正确。',
          details: { status: 'ready' }
        };
        imap.end();
      });
      
      imap.once('error', (err) => {
        logger.error('邮件服务器连接失败', err);
        connectionResult = {
          success: false,
          message: `连接失败: ${err.message}`,
          details: { error: err.message, code: err.code, source: err.source }
        };
        resolve(NextResponse.json(connectionResult));
      });
      
      imap.once('end', () => {
        logger.info('邮件服务器连接测试完成', connectionResult);
        resolve(NextResponse.json(connectionResult));
      });
      
      // 启动连接
      imap.connect();
    });
  } catch (error) {
    logger.error('测试邮件连接出错', error);
    return NextResponse.json({
      success: false,
      message: `测试出错: ${error instanceof Error ? error.message : '未知错误'}`,
      details: { error: error instanceof Error ? error.stack : '未知错误' }
    }, { status: 500 });
  }
} 