import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { translateText, translateLongText } from '@/lib/translate';
import { getAllEnvSettings } from '@/lib/env-service';

export async function POST(request: NextRequest) {
  try {
    // 查找所有没有中文标题的视频
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { titleZh: null },
          { titleZh: '' },
          { descriptionZh: null },
          { descriptionZh: '' }
        ],
        translationStatus: { not: 'processing' }
      },
      take: 10  // 每次修复10个
    });
    
    if (videos.length === 0) {
      return NextResponse.json({ 
        message: '没有需要修复的视频',
        fixed: 0 
      });
    }
    
    // 获取翻译服务设置
    const settingsObj = await getAllEnvSettings();
    
    const translationService = settingsObj.TRANSLATION_SERVICE || 'none';
    
    if (translationService === 'none') {
      return NextResponse.json({ 
        message: '翻译服务未启用，请先在设置中启用翻译服务',
        fixed: 0 
      });
    }
    
    let fixedCount = 0;
    const results = [];
    
    // 逐个修复视频
    for (const video of videos) {
      try {
        const updates = {};
        
        // 修复标题翻译
        if (!video.titleZh) {
          logger.info(`修复视频标题: ${video.id}, 标题: ${video.title.substring(0, 30)}...`);
          const titleZh = await translateText(video.title);
          if (titleZh && titleZh !== video.title) {
            updates.titleZh = titleZh;
          }
        }
        
        // 修复描述翻译
        if (!video.descriptionZh && video.description) {
          logger.info(`修复视频描述: ${video.id}`);
          const descriptionZh = await translateLongText(video.description);
          if (descriptionZh && descriptionZh !== video.description) {
            updates.descriptionZh = descriptionZh;
          }
        }
        
        // 更新视频
        if (Object.keys(updates).length > 0) {
          await prisma.video.update({
            where: { id: video.id },
            data: updates
          });
          
          fixedCount++;
          results.push({
            id: video.id,
            status: 'success',
            title: video.title?.substring(0, 30),
            titleZh: updates.titleZh?.substring(0, 30)
          });
        }
      } catch (error) {
        logger.error(`修复视频翻译失败 ${video.id}:`, error);
        results.push({
          id: video.id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return NextResponse.json({ 
      message: `成功修复 ${fixedCount}/${videos.length} 个视频的翻译`,
      fixed: fixedCount,
      results
    });
  } catch (error) {
    logger.error('修复翻译失败:', error);
    return NextResponse.json({ 
      error: '修复失败', 
      message: error.message 
    }, { status: 500 });
  }
} 