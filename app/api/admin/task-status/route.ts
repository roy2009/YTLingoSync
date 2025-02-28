import { NextResponse } from 'next/server';
import { getAllTaskStatus, getTaskStatus } from '@/lib/task-status-service';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskName = searchParams.get('taskName');
    
    if (taskName) {
      // 获取单个任务状态
      const status = await getTaskStatus(taskName);
      if (!status) {
        return NextResponse.json({ error: '任务不存在' }, { status: 404 });
      }
      return NextResponse.json(status);
    } else {
      // 获取所有任务状态
      const statuses = await getAllTaskStatus();
      return NextResponse.json(statuses);
    }
  } catch (error) {
    logger.error('获取任务状态失败', error);
    return NextResponse.json(
      { error: '获取任务状态失败' },
      { status: 500 }
    );
  }
}