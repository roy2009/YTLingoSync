'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface TaskStatus {
  id: string;
  taskName: string;
  lastRunTime: string | null;
  nextRunTime: string | null;
  status: string;
  errorMessage: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/task-status');
      if (!response.ok) {
        throw new Error('获取任务状态失败');
      }
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // 每30秒自动刷新一次
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '未设置';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  // 获取状态徽章颜色
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500">运行中</Badge>;
      case 'success':
        return <Badge className="bg-green-500">成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">失败</Badge>;
      case 'idle':
        return <Badge className="bg-gray-500">空闲</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 获取任务名称显示
  const getTaskDisplayName = (taskName: string) => {
    switch (taskName) {
      case 'video_sync_service':
        return '视频同步服务';
      case 'heygen_email_check':
        return 'HeyGen 邮件检查';
      case 'missing_data_update':
        return '缺失数据更新';
      default:
        return taskName;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">定时任务监控</h1>
        <Button onClick={fetchTasks} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>任务状态</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上次运行时间</TableHead>
                <TableHead>下次运行时间</TableHead>
                <TableHead>运行次数</TableHead>
                <TableHead>错误信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    暂无任务数据
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{getTaskDisplayName(task.taskName)}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{formatTime(task.lastRunTime)}</TableCell>
                    <TableCell>{formatTime(task.nextRunTime)}</TableCell>
                    <TableCell>{task.runCount}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {task.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}