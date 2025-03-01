import { prisma } from './prisma';
import { logger } from './logger';
import { fetchYouTubeVideosDetails } from './youtube-api';
import { submitToHeygen } from './heygen'; // 导入Heygen翻译功能

// 创建一个新的服务定期更新缺失的视频信息
export async function updateMissingVideoData() {
  try {
    logger.info('开始查询缺失时长信息的视频和待翻译视频');
    
    // 查询缺少持续时间的视频
    const videosWithoutDuration = await prisma.video.findMany({
      where: { duration: null },
      take: 50  // 每次处理一批，避免API限制
    });
    
    // 查询翻译状态为pending的视频
    const pendingTranslationVideos = await prisma.video.findMany({
      where: { 
        translationStatus: 'pending',
        // 确保视频有时长信息，因为翻译需要知道视频时长
        duration: { not: null }
      },
      take: 10  // 限制一批处理的数量，避免过多请求HeyGen API
    });
    
    const totalDurationMissing = videosWithoutDuration.length;
    const totalPendingTranslation = pendingTranslationVideos.length;
    
    logger.info(`找到 ${totalDurationMissing} 个缺失时长信息的视频和 ${totalPendingTranslation} 个待翻译视频需要处理`);
    
    // 处理缺失时长信息的视频
    let durationUpdatedCount = 0;
    
    if (totalDurationMissing > 0) {
      const videoIds = videosWithoutDuration.map(v => v.youtubeId);
      
      // 从YouTube API获取最新信息
      logger.info(`正在从YouTube API获取 ${videoIds.length} 个视频的详细信息`);
      const updatedData = await fetchYouTubeVideosDetails(videoIds);
      
      logger.info(`从API获取到 ${updatedData.length} 个视频的信息，开始更新数据库`);
      
      // 更新数据库中的记录
      for (const video of updatedData) {
        try {
          // 如果视频有时长信息，则更新
          if (video.durationSeconds) {
            await prisma.video.update({
              where: { youtubeId: video.id },
              data: { 
                duration: video.durationSeconds,
                // 可以同时更新其他可能缺失的信息
                updatedAt: new Date()
              }
            });
            durationUpdatedCount++;
            
            if (durationUpdatedCount % 10 === 0) {
              logger.info(`已更新 ${durationUpdatedCount}/${updatedData.length} 个视频的时长信息`);
            }
          } else {
            logger.warn(`视频 ${video.id} 未能获取到时长信息`);
          }
        } catch (error) {
          logger.error(`更新视频 ${video.id} 信息时出错:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      logger.info(`时长信息更新完成: 成功更新了 ${durationUpdatedCount}/${totalDurationMissing} 个视频的时长信息`);
    }
    
    // 处理待翻译的视频
    let translationSubmittedCount = 0;
    
    if (totalPendingTranslation > 0) {
      logger.info(`开始处理 ${totalPendingTranslation} 个待翻译视频`);
      
      // 逐个提交到HeyGen进行翻译
      for (const video of pendingTranslationVideos) {
        try {
          logger.info(`开始提交视频 ${video.youtubeId} (${video.title}) 到HeyGen翻译`);
          
          // 调用submitToHeygen函数进行翻译
          const success = await submitToHeygen(video.id);
          
          if (success) {
            translationSubmittedCount++;
            logger.info(`视频 ${video.youtubeId} 成功提交到HeyGen翻译，进度: ${translationSubmittedCount}/${totalPendingTranslation}`);
          } else {
            logger.error(`视频 ${video.youtubeId} 提交到HeyGen翻译失败`);
          }
          
          // 每次提交后稍微暂停一下，避免过快请求
          await new Promise(resolve => setTimeout(resolve, 10000));
          
        } catch (error) {
          logger.error(`提交视频 ${video.youtubeId} 翻译时出错:`, error instanceof Error ? error.message : String(error));
          
          // 更新视频状态为失败
          await prisma.video.update({
            where: { id: video.id },
            data: {
              translationStatus: 'failed',
              translationError: error instanceof Error ? error.message : '未知错误'
            }
          });
        }
      }
      
      logger.info(`翻译提交完成: 成功提交了 ${translationSubmittedCount}/${totalPendingTranslation} 个视频进行翻译`);
    }
    
    // 返回更新结果
    return { 
      durationUpdated: durationUpdatedCount,
      translationSubmitted: translationSubmittedCount,
      totalDurationMissing,
      totalPendingTranslation,
      message: `成功更新了 ${durationUpdatedCount} 个视频的时长信息，提交了 ${translationSubmittedCount} 个视频进行翻译`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('更新缺失视频数据和提交翻译时发生错误:', errorMessage);
    throw new Error(`更新缺失数据和提交翻译失败: ${errorMessage}`);
  }
} 