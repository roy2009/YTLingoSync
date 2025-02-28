import { NextResponse } from 'next/server';
import { initializeApp } from '@/lib/init';

// 用于初始化应用程序（在开发环境或者应用启动时调用）
export async function GET() {
  try {
    await initializeApp();
    
    return NextResponse.json({ success: true, message: '应用初始化成功' });
  } catch (error) {
    console.error('应用初始化失败:', error);
    return NextResponse.json(
      { error: '应用初始化失败' },
      { status: 500 }
    );
  }
} 