import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取单个或多个设置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get('keys');
    
    let where = {};
    if (keys) {
      where = {
        id: {
          in: keys.split(',')
        }
      };
    }
    
    const settings = await prisma.setting.findMany({
      where,
      select: {
        id: true,
        value: true
      }
    });
    
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('获取设置失败:', error);
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 });
  }
}

// 保存设置
export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: '无效的设置数据格式' }, 
        { status: 400 }
      );
    }
    
    // 使用事务批量更新设置
    const result = await prisma.$transaction(
      settings.map((setting: { id: string; value: string }) => 
        prisma.setting.upsert({
          where: { id: setting.id },
          update: { value: setting.value },
          create: { id: setting.id, value: setting.value }
        })
      )
    );
    
    return NextResponse.json({ 
      success: true, 
      message: '设置已保存',
      count: result.length 
    }, { status: 200 });
  } catch (error) {
    console.error('保存设置失败:', error);
    return NextResponse.json({ error: '保存设置失败' }, { status: 500 });
  }
} 