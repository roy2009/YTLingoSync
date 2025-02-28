import { NextResponse } from 'next/server';
import { syncAllSubscriptions } from '@/lib/sync-service';

// 此路由用于手动触发同步或通过外部cron服务调用
export async function GET() {
  try {
    await syncAllSubscriptions();
    return NextResponse.json({ success: true, message: '同步任务已触发' });
  } catch (error) {
    console.error('手动触发同步失败:', error);
    return NextResponse.json(
      { error: '同步任务失败' },
      { status: 500 }
    );
  }
} 