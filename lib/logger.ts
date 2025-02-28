import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 定义日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 获取环境变量中设置的日志级别，默认为'info'
const getLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  
  if (['debug', 'info', 'warn', 'error'].includes(level)) {
    return level;
  }
  
  return 'info';
};

// 判断是否应该记录该级别的日志
const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getLogLevel();
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
};

// 记录日志到数据库并打印到控制台
const log = async (
  level: LogLevel, 
  message: string, 
  details?: string | object,
  source?: string
) => {
  // 检查是否应该记录该级别的日志
  if (!shouldLog(level)) return;
  
  // 将对象转换为字符串
  let detailsString: string | undefined;
  if (details) {
    detailsString = typeof details === 'string' 
      ? details 
      : JSON.stringify(details, null, 2);
  }
  
  // 打印到控制台
  const timestamp = new Date().toISOString();
  console[level === 'error' ? 'error' : 'log'](
    `[${timestamp}] [${level.toUpperCase()}]${source ? ` [${source}]` : ''}: ${message}`
  );
  
  if (detailsString) {
    console[level === 'error' ? 'error' : 'log'](detailsString);
  }
  
  try {
    // 记录到数据库
    await prisma.log.create({
      data: {
        level,
        message,
        details: detailsString,
        source,
        timestamp: new Date()
      }
    });
  } catch (error) {
    // 记录数据库错误到控制台
    console.error('Failed to write log to database:', error);
  }
};

// 导出日志函数
export const logger = {
  debug: (message: string, details?: string | object, source?: string) => 
    log('debug', message, details, source),
  info: (message: string, details?: string | object, source?: string) => 
    log('info', message, details, source),
  warn: (message: string, details?: string | object, source?: string) => 
    log('warn', message, details, source),
  error: (message: string, details?: string | object, source?: string) => 
    log('error', message, details, source)
}; 