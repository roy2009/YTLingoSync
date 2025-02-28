// 创建一个新的服务定期更新缺失的视频信息
export async function updateMissingVideoData() {
  const videosWithoutDuration = await prisma.video.findMany({
    where: { duration: null },
    take: 50  // 每次处理一批，避免API限制
  });
  
  if (videosWithoutDuration.length === 0) return;
  
  const videoIds = videosWithoutDuration.map(v => v.youtubeId);
  
  // 从YouTube API获取最新信息
  const updatedData = await fetchYouTubeVideosDetails(videoIds);
  
  // 更新数据库中的记录
  for (const video of updatedData) {
    await prisma.video.update({
      where: { youtubeId: video.id },
      data: { 
        duration: video.durationSeconds,
        // 可以同时更新其他可能缺失的信息
      }
    });
  }
} 