import { NextResponse } from 'next/server';
import { getQuotaStatus, resetSessionQuota } from '@/lib/quota-tracker';

// 获取配额使用状况
export async function GET() {
  try {
    const quotaStatus = getQuotaStatus();
    
    return NextResponse.json({
      success: true,
      ...quotaStatus,
      quotaResetTime: quotaStatus.quotaResetTime.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取API配额信息失败' }, 
      { status: 500 }
    );
  }
}

// 重置会话配额计数
export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset') {
      resetSessionQuota();
      return NextResponse.json({
        success: true,
        message: '会话配额计数已重置'
      });
    }
    
    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: '处理配额操作失败' },
      { status: 500 }
    );
  }
} 