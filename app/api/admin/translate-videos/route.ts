import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateText, translateLongText } from '@/lib/translate';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 获取请求参数
    const { limit = 10 } = await request.json();
    
    // 查找所有没有中文标题的视频
    const videos = await prisma.video.findMany({
      where: { 
        titleZh: null 
      },
      take: limit
    });
    
    if (videos.length === 0) {
      return NextResponse.json({ 
        message: '没有需要翻译的视频',
        translated: 0 
      });
    }
    
    let translatedCount = 0;
    let failedCount = 0;
    const results = [];
    
    // 逐个翻译视频
    for (const video of videos) {
      try {
        logger.info(`开始翻译视频: ID=${video.id}, 标题=${video.title.substring(0, 30)}...`);
        
        // 翻译标题
        const titleZh = await translateText(video.title);
        
        // 检查翻译结果是否与原文相同
        if (titleZh === video.title) {
          logger.warn(`视频 ${video.id} 标题翻译结果与原文相同，可能未成功翻译`);
          results.push({
            id: video.id,
            status: 'warning',
            message: '翻译结果与原文相同，可能未成功翻译'
          });
          failedCount++;
          continue; // 跳过保存
        }
        
        // 翻译描述（如果有）
        let descriptionZh = null;
        if (video.description) {
          descriptionZh = await translateLongText(video.description);
        }
        
        // 更新视频
        await prisma.video.update({
          where: { id: video.id },
          data: { 
            titleZh,
            descriptionZh 
          }
        });
        
        translatedCount++;
        logger.info(`已翻译视频: ${video.id}, 原标题: ${video.title.substring(0, 30)}..., 翻译后: ${titleZh.substring(0, 30)}...`);
        
        results.push({
          id: video.id,
          status: 'success',
          original: video.title.substring(0, 30),
          translated: titleZh.substring(0, 30)
        });
      } catch (error) {
        logger.error(`翻译视频失败 ${video.id}:`, error);
        failedCount++;
        results.push({
          id: video.id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return NextResponse.json({ 
      message: `成功翻译 ${translatedCount}/${videos.length} 个视频, 失败 ${failedCount} 个`,
      translated: translatedCount,
      failed: failedCount,
      results
    });
    
  } catch (error) {
    logger.error('批量翻译视频失败:', error);
    return NextResponse.json({ 
      error: '翻译失败', 
      message: error.message 
    }, { status: 500 });
  }
} 