import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get('table');
    
    if (!table) {
      return NextResponse.json({ error: '未指定表名' }, { status: 400 });
    }
    
    let records = [];
    const limit = Number(searchParams.get('limit')) || 100;
    
    // 根据表名查询数据
    switch (table) {
      case 'Subscription':
        records = await prisma.subscription.findMany({ 
          take: limit,
          include: { _count: { select: { videos: true } } }
        });
        break;
      case 'Video':
        records = await prisma.video.findMany({ 
          take: limit,
          include: { _count: { select: { translations: true } } }
        });
        break;
      case 'Translation':
        records = await prisma.translation.findMany({ take: limit });
        break;
      case 'Setting':
        records = await prisma.setting.findMany({ take: limit });
        break;
      case 'Log':
        records = await prisma.log.findMany({ 
          take: limit,
          orderBy: { timestamp: 'desc' }
        });
        break;
      default:
        return NextResponse.json({ error: '不支持的表名' }, { status: 400 });
    }
    
    return NextResponse.json({ records });
  } catch (error) {
    console.error('获取表数据失败:', error);
    return NextResponse.json({ error: '获取表数据失败' }, { status: 500 });
  }
} 