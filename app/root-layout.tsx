import { startHeyGenEmailCheckJob } from '@/lib/heygen-cron-job';
import { ReactNode } from 'react';

export default async function RootLayout({ children }: { children: ReactNode }) {
  // 启动 HeyGen 邮件检查任务
  if (process.env.NODE_ENV === 'production') {
    try {
      await startHeyGenEmailCheckJob();
    } catch (error) {
      console.error('启动 HeyGen 邮件检查任务失败:', error);
    }
  }
  
  // 其他布局代码...
} 