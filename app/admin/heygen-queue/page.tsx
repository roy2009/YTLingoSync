import { Suspense } from 'react';
import { Metadata } from 'next';
import HeygenQueueStatus from '@/components/admin/HeygenQueueStatus';

export const metadata: Metadata = {
  title: 'HeyGen队列状态',
  description: '查看当前HeyGen翻译队列状态'
};

export default function HeygenQueuePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">HeyGen翻译队列状态</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <Suspense fallback={<div className="text-center py-4">加载中...</div>}>
          <HeygenQueueStatus />
        </Suspense>
      </div>
    </div>
  );
} 