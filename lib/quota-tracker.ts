/**
 * YouTube API 配额跟踪器
 * 
 * YouTube Data API v3 配额消耗规则：
 * - 每日配额上限通常为10,000个单位
 * - 不同操作消耗不同配额：
 *   - 大多数read操作消耗1个单位
 *   - search.list调用消耗100个单位
 *   - 等等
 * 
 * 参考: https://developers.google.com/youtube/v3/getting-started#quota
 */

// 定义配额消耗常量
export const QUOTA_COSTS = {
  // 读取操作
  READ_OPERATION: 1,
  // 搜索操作
  SEARCH_OPERATION: 100,
  // 视频列表批量获取 (默认为单个视频的读取成本)
  VIDEOS_LIST: 1,
  // 频道信息获取
  CHANNELS_LIST: 1,
  // 播放列表信息获取
  PLAYLISTS_LIST: 1,
  // 播放列表项目获取
  PLAYLIST_ITEMS_LIST: 1
};

// 跟踪状态
interface QuotaState {
  // 本次会话消耗的配额
  sessionQuotaUsed: number;
  // 今日已消耗的配额 (包括本次会话)
  dailyQuotaUsed: number;
  // 配额重置时间 (太平洋时间午夜)
  quotaResetTime: Date;
  // 操作历史记录
  operations: Array<{
    timestamp: Date;
    type: string;
    cost: number;
    endpoint: string;
  }>;
}

// 初始状态
const initialState: QuotaState = {
  sessionQuotaUsed: 0,
  dailyQuotaUsed: 0,
  quotaResetTime: calculateNextResetTime(),
  operations: []
};

// 单例状态
let quotaState: QuotaState = { ...initialState };

/**
 * 计算下一个配额重置时间（太平洋时间午夜）
 */
function calculateNextResetTime(): Date {
  const now = new Date();
  // 创建太平洋时间的日期对象
  const pacificDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  // 设置为下一天的午夜
  pacificDate.setDate(pacificDate.getDate() + 1);
  pacificDate.setHours(0, 0, 0, 0);
  return pacificDate;
}

/**
 * 记录API操作并更新配额使用情况
 */
export function trackApiOperation(operationType: keyof typeof QUOTA_COSTS, endpoint: string): number {
  // 获取操作成本
  const cost = QUOTA_COSTS[operationType] || 1;
  
  // 检查是否需要重置每日配额
  const now = new Date();
  if (now > quotaState.quotaResetTime) {
    // 重置每日配额，但保留会话配额
    quotaState.dailyQuotaUsed = 0;
    quotaState.quotaResetTime = calculateNextResetTime();
  }
  
  // 更新配额使用情况
  quotaState.sessionQuotaUsed += cost;
  quotaState.dailyQuotaUsed += cost;
  
  // 记录操作
  quotaState.operations.push({
    timestamp: now,
    type: operationType,
    cost,
    endpoint
  });
  
  // 返回消耗的配额
  return cost;
}

/**
 * 获取当前配额使用状态
 */
export function getQuotaStatus(): Omit<QuotaState, 'operations'> & { recentOperations: QuotaState['operations'] } {
  // 检查是否需要重置每日配额
  const now = new Date();
  if (now > quotaState.quotaResetTime) {
    quotaState.dailyQuotaUsed = 0;
    quotaState.quotaResetTime = calculateNextResetTime();
  }
  
  // 返回状态副本（不包含完整历史记录，仅最近10条）
  return {
    sessionQuotaUsed: quotaState.sessionQuotaUsed,
    dailyQuotaUsed: quotaState.dailyQuotaUsed,
    quotaResetTime: quotaState.quotaResetTime,
    recentOperations: quotaState.operations.slice(-10)
  };
}

/**
 * 重置会话配额计数
 */
export function resetSessionQuota(): void {
  quotaState.sessionQuotaUsed = 0;
  quotaState.operations = [];
}

/**
 * 手动设置当日已用配额
 * 用于从 YouTube API 响应头中提取实际配额使用情况
 */
export function setDailyQuotaUsed(quotaUsed: number): void {
  quotaState.dailyQuotaUsed = quotaUsed;
} 