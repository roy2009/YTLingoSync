import { NextRequest, NextResponse } from 'next/server';
import { getHeygenQueueStatus } from '@/lib/heygen';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 获取HeyGen翻译队列状态的API端点
 */
export async function GET(req: NextRequest) {
  try {
    // 这里可以根据项目需求添加适当的权限验证
    // 简单实现：检查请求的Authorization头或其他验证方式
    const authHeader = req.headers.get('authorization');
    
    // 简单的认证检查示例 - 实际项目中应使用更安全的方法
    // 这里仅作为示例，实际实现应根据项目的认证机制调整
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '无权访问此API，需要认证' },
        { status: 401 }
      );
    }
    
    // 获取队列状态
    const queueStatus = getHeygenQueueStatus();
    
    return NextResponse.json({
      success: true,
      status: queueStatus
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('获取HeyGen队列状态失败:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
} 