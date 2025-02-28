// 为播放列表分配一个固定颜色，使每个播放列表有唯一且一致的颜色
export function getColorForPlaylist(id: string): string {
  // 从播放列表ID生成一个数字
  const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 根据这个数字选择一种颜色
  const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
  return colors[num % colors.length];
}

// 解析 YouTube 时长格式 (PT1H2M10S) 为秒数
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const [_, hours, minutes, seconds] = match;
  return (parseInt(hours || '0') * 3600) + 
         (parseInt(minutes || '0') * 60) + 
         parseInt(seconds || '0');
} 