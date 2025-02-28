import { syncSubscription } from '../lib/sync-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subscriptionId = process.argv[2];
  
  if (!subscriptionId) {
    console.error('请提供订阅ID作为参数');
    process.exit(1);
  }
  
  console.log(`开始测试同步订阅: ${subscriptionId}`);
  
  try {
    const result = await syncSubscription(subscriptionId);
    console.log('同步完成:', result);
    
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        _count: { select: { videos: true } }
      }
    });
    
    console.log('订阅信息:', {
      id: subscription?.id,
      name: subscription?.name,
      videoCount: subscription?._count.videos,
      lastSync: subscription?.lastSync
    });
  } catch (error) {
    console.error('同步失败:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  }); 