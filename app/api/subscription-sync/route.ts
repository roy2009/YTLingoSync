import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { syncSubscription } from '@/lib/sync-service';

export async function POST(request: NextRequest) {
  try {
    const logs = ['开始同步订阅...'];
    
    // 从查询参数或请求体获取ID
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      // 尝试从请求体获取
      const body = await request.json().catch(() => ({}));
      if (!body.id) {
        return NextResponse.json(
          { error: '缺少订阅ID' },
          { status: 400 }
        );
      }
    }
    
    logger.debug(`收到同步请求: 订阅ID ${id}`);
    
    // 其余代码不变...
  } catch (error) {
    // 错误处理...
  }
} 