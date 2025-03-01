import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建所有必要设置
  const settings = [
    { id: 'YOUTUBE_API_KEY', value: '' },
    { id: 'PROXY_ENABLED', value: 'false' },
    { id: 'PROXY_URL', value: '' },
    { id: 'PROXY_USERNAME', value: '' },
    { id: 'PROXY_PASSWORD', value: '' },
    { id: 'VERIFY_SSL', value: 'true' }
  ];
  
  logger.debug('开始初始化基本设置...');
  
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { id: setting.id },
      update: {},
      create: setting
    });
    logger.debug(`- 设置 ${setting.id} 已创建`);
  }

  logger.debug('数据库初始化完成！');
}

main()
  .catch(e => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 