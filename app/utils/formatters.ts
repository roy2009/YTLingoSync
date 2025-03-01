// 为播放列表分配一个固定颜色，使每个播放列表有唯一且一致的颜色
export function getColorForPlaylist(id: string): string {
  // 从播放列表ID生成一个数字
  const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 根据这个数字选择一种颜色
  const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
  return colors[num % colors.length];
}

// 添加时长格式化函数
export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
} 