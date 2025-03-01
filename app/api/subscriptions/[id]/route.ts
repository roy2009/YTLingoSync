import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 更新订阅信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, maxDurationForTranslation, targetLanguage, autoTranslate } = await request.json();
    const logs = ['开始更新订阅设置...'];
    
    // 检查订阅是否存在
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在', logs },
        { status: 404 }
      );
    }
    
    // 准备更新数据
    const updateData: any = {};
    
    // 只更新提供的字段
    if (name !== undefined) updateData.name = name;
    if (maxDurationForTranslation !== undefined) updateData.maxDurationForTranslation = maxDurationForTranslation;
    if (targetLanguage !== undefined) updateData.targetLanguage = targetLanguage;
    if (autoTranslate !== undefined) updateData.autoTranslate = autoTranslate;
    
    // 更新订阅
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: updateData
    });
    
    logs.push(`✅ 订阅设置已更新: ${updatedSubscription.name}`);
    logger.info(`更新订阅设置: ${updatedSubscription.name} (${updatedSubscription.id})`);
    
    return NextResponse.json({
      message: '订阅设置已更新',
      subscription: updatedSubscription,
      logs
    });
  } catch (error) {
    logger.error(`更新订阅失败`, error as object);
    return NextResponse.json(
      { error: '更新订阅失败', logs: ['❌ 更新订阅失败'] },
      { status: 500 }
    );
  }
}

// 删除订阅
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    logger.error(`删除订阅失败`, error as object);
    return NextResponse.json(
      { error: '删除订阅失败' },
      { status: 500 }
    );
  }
}

// GET 处理函数
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    logger.error(`获取订阅失败`, error as object);
    return NextResponse.json(
      { error: '获取订阅失败' },
      { status: 500 }
    );
  }
}