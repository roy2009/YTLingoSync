'use client';

import { useEffect, useState } from 'react';

interface QueueStatus {
  isProcessing: boolean;
  queueLength: number;
  queuedTasks: {
    videoId: string;
    addTime: string;
    waitingTime: string;
  }[];
}

export default function HeygenQueueStatus() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/heygen-queue-status', {
        headers: {
          'Authorization': 'Bearer admin-token' // 实际项目中应使用正确的认证方式
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取队列状态失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
      } else {
        throw new Error(data.error || '获取队列状态失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // 每30秒自动刷新一次
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return <div className="text-center py-8">正在加载队列状态...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
        <div className="mb-2">{error}</div>
        <button 
          className="bg-transparent hover:bg-red-500 text-red-700 hover:text-white py-1 px-3 border border-red-500 hover:border-transparent rounded" 
          onClick={fetchQueueStatus}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">HeyGen翻译队列状态</h2>
        <button 
          className="bg-transparent hover:bg-blue-500 text-blue-700 hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded" 
          onClick={fetchQueueStatus}
        >
          刷新
        </button>
      </div>
      
      {status && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">当前状态</div>
              <div className="mt-1 text-xl font-bold">
                {status.isProcessing ? (
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">
                    正在处理
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-gray-500 rounded-full">
                    空闲
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">队列长度</div>
              <div className="mt-1 text-xl font-bold">{status.queueLength} 个任务</div>
            </div>
          </div>
          
          {status.queuedTasks.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium mb-2">队列中的任务</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="py-2 px-4 text-left">视频ID</th>
                      <th className="py-2 px-4 text-left">添加时间</th>
                      <th className="py-2 px-4 text-left">等待时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {status.queuedTasks.map((task, index) => (
                      <tr key={`${task.videoId}-${index}`}>
                        <td className="py-2 px-4 font-medium">{task.videoId}</td>
                        <td className="py-2 px-4">{new Date(task.addTime).toLocaleString()}</td>
                        <td className="py-2 px-4">{task.waitingTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              目前队列中没有待处理的任务
            </div>
          )}
        </>
      )}
    </div>
  );
} 