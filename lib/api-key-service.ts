import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 计算API密钥配额重置时间（太平洋时间午夜）
function calculateNextResetTime(): Date {
  // 当前UTC时间
  const now = new Date();
  
  // 将当前时间转换为太平洋时间（简化处理）
  // 获取太平洋时间的日期部分（忽略时分秒）
  const pacificDateStr = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  
  // 创建下一天的日期 - 首先解析日期字符串格式 (MM/DD/YYYY)
  const [month, day, year] = pacificDateStr.split('/').map(Number);
  
  // 创建太平洋时间的下一天午夜时间（月份从0开始）
  const pacificReset = new Date(Date.UTC(year, month - 1, day + 1));
  
  // 应用太平洋时区的偏移
  // PST是UTC-8，PDT是UTC-7
  // 由于我们设置的是UTC时间的0点，需要加上8或7小时
  // 通过检查当前是否为夏令时来确定偏移量
  const isPDT = /\((.+)\)$/.exec(
    now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'long' })
  )?.[1] === 'Pacific Daylight Time';
  
  // 如果是夏令时，偏移7小时，否则偏移8小时
  const offsetHours = isPDT ? 7 : 8;
  
  return new Date(pacificReset.getTime() + offsetHours * 60 * 60 * 1000);
}

// 定义YouTube API操作类型和对应的配额消耗
export const QUOTA_COSTS = {
  READ_OPERATION: 1,
  SEARCH_OPERATION: 100,
  VIDEOS_LIST: 1,
  CHANNELS_LIST: 1,
  PLAYLISTS_LIST: 1,
  PLAYLIST_ITEMS_LIST: 1
};

export type QuotaOperationType = keyof typeof QUOTA_COSTS;

interface YouTubeApiKey {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  dailyQuotaLimit: number;
  currentUsage: number;
  resetTime: Date;
  lastUsed: Date | null;
  isValid: boolean;
  errorMessage: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取活跃的API密钥
 * 会检查配额使用情况，如果配额已用完则会尝试切换到下一个可用的密钥
 */
export async function getActiveApiKey(): Promise<{ key: string; keyId: string } | null> {
  try {
    // 检查是否需要重置配额
    await checkAndResetQuotas();
    
    // 获取所有活跃且有效且配额未用完的密钥，按优先级排序
    const availableKeys = await prisma.youTubeApiKey.findMany({
      where: {
        isActive: true,
        isValid: true,
        currentUsage: { lt: prisma.youTubeApiKey.fields.dailyQuotaLimit }
      },
      orderBy: [
        { priority: 'asc' },
        { currentUsage: 'asc' }
      ],
      take: 1
    });
    
    if (availableKeys.length === 0) {
      logger.error('没有可用的YouTube API密钥，所有密钥配额已用完或无效');
      return null;
    }
    
    const activeKey = availableKeys[0];
    logger.debug('getActiveApiKey() - 返回key：', activeKey);
    return { key: activeKey.key, keyId: activeKey.id };
  } catch (error) {
    logger.error('获取活跃API密钥失败', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * 检查并重置已过期配额
 */
async function checkAndResetQuotas(): Promise<void> {
  try {
    const now = new Date();
    
    // 找出所有需要重置配额的密钥
    const keysToReset = await prisma.youTubeApiKey.findMany({
      where: {
        resetTime: { lt: now }
      },
    });
    
    if (keysToReset.length > 0) {
      // 批量更新这些密钥的配额和重置时间
      await Promise.all(
        keysToReset.map((key: YouTubeApiKey) => 
          prisma.youTubeApiKey.update({
            where: { id: key.id },
            data: {
              currentUsage: 0,
              resetTime: calculateNextResetTime()
            }
          })
        )
      );
      
      logger.info(`已重置 ${keysToReset.length} 个YouTube API密钥的配额`);
    }
  } catch (error) {
    logger.error('检查和重置API密钥配额失败', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 记录API调用并更新配额使用情况
 */
export async function trackApiUsage(
  keyId: string, 
  operationType: QuotaOperationType, 
  endpoint: string,
  success: boolean = true,
  errorInfo?: string
): Promise<boolean> {
  try {
    // 获取操作成本
    const cost = QUOTA_COSTS[operationType] || 1;
    
    // 更新密钥使用记录
    await prisma.$transaction([
      // 更新API密钥的使用量和最后使用时间
      prisma.youTubeApiKey.update({
        where: { id: keyId },
        data: {
          currentUsage: { increment: cost },
          lastUsed: new Date(),
          // 如果调用失败且是配额超限错误，标记密钥为无效
          ...((!success && errorInfo?.includes('quotaExceeded')) 
              ? { isValid: false, errorMessage: errorInfo } 
              : {})
        }
      }),
      
      // 创建使用记录
      prisma.apiKeyUsageRecord.create({
        data: {
          keyId,
          endpoint,
          quotaCost: cost,
          success,
          errorInfo: errorInfo || null
        }
      })
    ]);
    
    return true;
  } catch (error) {
    logger.error('记录API使用情况失败', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * 获取配额使用状态
 */
export async function getQuotaStatus() {
  try {
    // 获取所有API密钥的状态
    const keys = await prisma.youTubeApiKey.findMany({
      orderBy: [
        { priority: 'asc' },
        { isActive: 'desc' }
      ],
      include: {
        _count: {
          select: {
            usageRecords: true
          }
        }
      }
    });
    
    // 获取今日总用量
    const totalUsage = keys.reduce((sum, key) => sum + key.currentUsage, 0);
    
    // 获取总配额限制
    const totalLimit = keys
      .filter(key => key.isActive && key.isValid)
      .reduce((sum, key) => sum + key.dailyQuotaLimit, 0);
    
    // 获取最近的使用记录
    const recentRecords = await prisma.apiKeyUsageRecord.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: {
        apiKey: {
          select: {
            name: true,
            key: true
          }
        }
      }
    });
    
    return {
      keys: keys.map(key => ({
        id: key.id,
        name: key.name,
        key: maskApiKey(key.key),
        isActive: key.isActive,
        isValid: key.isValid,
        priority: key.priority,
        currentUsage: key.currentUsage,
        dailyQuotaLimit: key.dailyQuotaLimit,
        usagePercentage: Math.round((key.currentUsage / key.dailyQuotaLimit) * 100),
        resetTime: key.resetTime,
        lastUsed: key.lastUsed,
        errorMessage: key.errorMessage,
        recordCount: key._count.usageRecords
      })),
      summary: {
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.isActive && k.isValid).length,
        totalUsage,
        totalLimit,
        usagePercentage: totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0
      },
      recentActivity: recentRecords.map(record => ({
        id: record.id,
        keyName: record.apiKey.name,
        keyMasked: maskApiKey(record.apiKey.key),
        endpoint: record.endpoint,
        quotaCost: record.quotaCost,
        timestamp: record.timestamp,
        success: record.success,
        errorInfo: record.errorInfo
      }))
    };
  } catch (error) {
    logger.error('获取配额状态失败', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * 掩盖API密钥，只显示前4位和后4位
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) return '********';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * 添加新的API密钥
 */
export async function addApiKey(data: { 
  key: string; 
  name: string; 
  dailyQuotaLimit?: number;
  priority?: number;
  isActive?: boolean;
}): Promise<any> {
  // 验证密钥格式合法性
  if (!data.key || !data.key.trim()) {
    throw new Error('API密钥不能为空');
  }
  
  // 检查密钥是否已存在
  const existing = await prisma.youTubeApiKey.findUnique({
    where: { key: data.key }
  });
  
  if (existing) {
    throw new Error('API密钥已存在');
  }
  
  // 创建新密钥
  return prisma.youTubeApiKey.create({
    data: {
      key: data.key,
      name: data.name || `密钥 ${new Date().toISOString().slice(0, 10)}`,
      dailyQuotaLimit: data.dailyQuotaLimit || 10000,
      priority: data.priority !== undefined ? data.priority : 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      resetTime: calculateNextResetTime(),
      currentUsage: 0
    }
  });
}

/**
 * 更新API密钥信息
 */
export async function updateApiKey(id: string, data: {
  name?: string;
  isActive?: boolean;
  dailyQuotaLimit?: number;
  priority?: number;
  currentUsage?: number;
}): Promise<any> {
  return prisma.youTubeApiKey.update({
    where: { id },
    data
  });
}

/**
 * 删除API密钥
 */
export async function deleteApiKey(id: string): Promise<any> {
  return prisma.youTubeApiKey.delete({
    where: { id }
  });
}

/**
 * 重置API密钥状态
 */
export async function resetApiKeyStatus(id: string): Promise<any> {
  return prisma.youTubeApiKey.update({
    where: { id },
    data: {
      isValid: true,
      errorMessage: null,
      currentUsage: 0,
      resetTime: calculateNextResetTime()
    }
  });
}

/**
 * 初始化系统默认API密钥
 */
export async function initializeDefaultApiKey(defaultKey?: string): Promise<void> {
  if (!defaultKey) return;
  
  const count = await prisma.youTubeApiKey.count();
  
  if (count === 0) {
    try {
      await addApiKey({
        key: defaultKey,
        name: '默认API密钥',
        dailyQuotaLimit: 10000,
        priority: 0,
        isActive: true
      });
      logger.info('已创建默认YouTube API密钥');
    } catch (error) {
      logger.error('创建默认API密钥失败', error instanceof Error ? error.message : String(error));
    }
  }
} 