'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Progress可能需要创建
const ProgressComponent = ({ value, className }: { value: number, className?: string }) => (
  <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden`}>
    <div 
      className={`h-full ${className || 'bg-green-500'}`} 
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface QuotaStatusData {
  success: boolean;
  sessionQuotaUsed: number;
  dailyQuotaUsed: number;
  quotaResetTime: string;
  recentOperations: Array<{
    timestamp: string;
    type: string;
    cost: number;
    endpoint: string;
  }>;
}

const MAX_DAILY_QUOTA = 10000; // YouTube API 每日配额限制

export default function QuotaStatus() {
  const [quotaData, setQuotaData] = useState<QuotaStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取配额状态
  const fetchQuotaStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/quota');
      if (!response.ok) {
        throw new Error('获取配额信息失败');
      }
      
      const data = await response.json();
      setQuotaData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 重置会话配额
  const resetSessionQuota = async () => {
    try {
      const response = await fetch('/api/quota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      
      if (!response.ok) {
        throw new Error('重置配额失败');
      }
      
      // 重新获取配额状态
      fetchQuotaStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    }
  };

  // 组件挂载时获取配额状态
  useEffect(() => {
    fetchQuotaStatus();
    
    // 每分钟自动刷新一次
    const interval = setInterval(fetchQuotaStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !quotaData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>YouTube API 配额状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <p>加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !quotaData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>YouTube API 配额状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 text-red-500 rounded">
            <p>获取配额信息失败: {error}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchQuotaStatus} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!quotaData) return null;

  // 计算配额使用百分比
  const dailyQuotaPercentage = (quotaData.dailyQuotaUsed / MAX_DAILY_QUOTA) * 100;
  
  // 根据使用情况确定进度条颜色类名
  const getProgressColorClass = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // 格式化重置时间
  const formatResetTime = () => {
    try {
      const resetDate = new Date(quotaData.quotaResetTime);
      return formatDistanceToNow(resetDate, { addSuffix: true, locale: zhCN });
    } catch (e) {
      return '未知';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>YouTube API 配额状态</CardTitle>
          <Button onClick={fetchQuotaStatus} variant="ghost">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">日配额使用: {quotaData.dailyQuotaUsed} / {MAX_DAILY_QUOTA}</span>
              <span className="text-sm font-medium">{dailyQuotaPercentage.toFixed(1)}%</span>
            </div>
            <ProgressComponent 
              value={dailyQuotaPercentage} 
              className={getProgressColorClass(dailyQuotaPercentage)} 
            />
            <p className="text-xs text-gray-500 mt-1">
              重置时间: {formatResetTime()}
            </p>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">本次会话使用: {quotaData.sessionQuotaUsed}</span>
              <Button onClick={resetSessionQuota} variant="outline" className="text-xs h-7 px-2">
                重置会话计数
              </Button>
            </div>
          </div>
          
          {quotaData.recentOperations && quotaData.recentOperations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">最近API操作:</h3>
              <div className="text-xs max-h-32 overflow-y-auto border rounded-md p-2">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-1">时间</th>
                      <th className="text-left pb-1">操作</th>
                      <th className="text-right pb-1">消耗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotaData.recentOperations.map((op, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-1">
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1">{op.endpoint}</td>
                        <td className="text-right py-1">{op.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 