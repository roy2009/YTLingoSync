import { prisma } from './prisma';
import { processVideoForTranslation } from './video-processor';
import { submitToHeygen } from './heygen';

// 任务队列和处理状态
let isProcessing = false;
const queue: string[] = [];
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_TRANSLATIONS || '2', 10);
let activeTranslations = 0;

export function queueTranslation(translationId: string) {
  queue.push(translationId);
  processQueue();
}

async function processQueue() {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    
    while (queue.length > 0 && activeTranslations < MAX_CONCURRENT) {
      const translationId = queue.shift();
      if (!translationId) continue;
      
      activeTranslations++;
      
      // 异步处理翻译任务，不等待完成
      processTranslation(translationId).finally(() => {
        activeTranslations--;
        // 处理完一个后继续检查队列
        processQueue();
      });
    }
  } finally {
    isProcessing = false;
  }
}

async function processTranslation(translationId: string) {
  try {
    // 获取翻译任务信息
    const translation = await prisma.translation.findUnique({
      where: { id: translationId },
      include: { video: true }
    });
    
    if (!translation) {
      console.error(`翻译任务 ${translationId} 不存在`);
      return;
    }
    
    // 更新状态为处理中
    await prisma.translation.update({
      where: { id: translationId },
      data: { status: 'processing' }
    });
    
    const { video } = translation;
    
    // 如果视频时长超过30分钟(1800秒)且未分段，则需要处理分段
    if ((video.duration || 0) > 1800 && !translation.partIndex) {
      await processVideoForTranslation(video.id);
      return;
    }
    
    // 提交到Heygen进行翻译
    const success = await submitToHeygen(video.id);
    
    if (!success) {
      // 更新翻译任务的Heygen任务ID
    await prisma.translation.update({
      where: { id: translationId },
      data: {
        status: 'processing' // 状态保持为processing直到Heygen完成
      }
    });
  }
    
  } catch (error) {
    console.error(`处理翻译任务 ${translationId} 失败:`, error);
    
    // 更新状态为失败
    await prisma.translation.update({
      where: { id: translationId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

async function updateVideoTranslationStatus(videoId: string, status: string, error?: string) {
  return await prisma.video.update({
    where: { id: videoId },
    data: {
      translationStatus: status,
      translationError: error
    }
  });
}

async function getNextVideoForTrans() {
  return await prisma.video.findFirst({
    where: { 
      translationStatus: { in: ['pending', 'failed'] },
      processed: true // 确保视频已经处理完成
    }
  });
}

// 旧代码
// async function createTranslation(videoId: string) {
//   return await prisma.translation.create({
//     data: {
//       videoId,
//       status: 'pending'
//     }
//   });
// }

// 旧代码
// async function getNextPendingTranslation() {
//   return await prisma.translation.findFirst({
//     where: { status: 'pending' },
//     include: { video: true }
//   });
// } 