import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 删除订阅
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
    // 检查订阅是否存在
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      );
    }
    
    // 删除订阅（视频和翻译会因级联关系被自动删除）
    await prisma.subscription.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('删除订阅失败:', error);
    return NextResponse.json(
      { error: '删除订阅失败' },
      { status: 500 }
    );
  }
}

// GET 处理函数
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
    // 获取订阅信息的逻辑
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json(
      { error: '获取订阅失败' },
      { status: 500 }
    );
  }
} 