import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 在这里实现缓存清除逻辑
    // 例如: await clearRedisCache();
    
    // 模拟清除操作
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({ 
      success: true,
      message: '缓存已成功清除'
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    return NextResponse.json({ 
      success: false,
      message: '清除缓存失败'
    }, { status: 500 });
  }
} 