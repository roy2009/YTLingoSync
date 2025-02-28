// 创建一个 db.ts 文件作为数据库访问的统一入口
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// 导出数据库客户端
export const db = prisma; 