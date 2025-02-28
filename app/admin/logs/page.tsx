'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  details?: string;
  source?: string;
  timestamp: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3); // 秒
  const logContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const level = searchParams.get('level') || 'all';
  
  // 获取日志函数
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/logs?level=${level}`);
      if (!res.ok) throw new Error('获取日志失败');
      
      const data = await res.json();
      setLogs(data.logs);
      
      // 自动滚动到底部
      if (logContainerRef.current && autoRefresh) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载和轮询更新
  useEffect(() => {
    if (autoRefresh) {
      const eventSource = new EventSource(`/api/admin/logs/stream?level=${level}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLogs(data.logs);
        
        // 自动滚动到底部
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        // 如果SSE连接失败，回退到轮询
        setAutoRefresh(false);
      };
      
      return () => {
        eventSource.close();
      };
    } else {
      // 使用轮询作为备选方案
      fetchLogs();
      const intervalId = setInterval(fetchLogs, refreshInterval * 1000);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, refreshInterval, level]);
  
  // 日志级别过滤器
  const levelOptions = [
    { value: 'all', label: '全部' },
    { value: 'debug', label: '调试' },
    { value: 'info', label: '信息' },
    { value: 'warn', label: '警告' },
    { value: 'error', label: '错误' }
  ];
  
  // 日志级别对应的颜色
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-200';
    }
  };
  
  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <h1 className="text-2xl font-bold mb-6">系统日志</h1>
      
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="level-filter" className="mr-2">日志级别:</label>
          <select 
            id="level-filter"
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5"
            value={level}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set('level', e.target.value);
              window.history.pushState({}, '', url);
              fetchLogs();
            }}
          >
            {levelOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="auto-refresh"
            className="mr-2"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <label htmlFor="auto-refresh" className="mr-4">自动刷新</label>
          
          <label htmlFor="refresh-interval" className="mr-2">刷新间隔 (秒):</label>
          <input
            type="number"
            id="refresh-interval"
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2 w-20"
            value={refreshInterval}
            min={1}
            max={60}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 3)}
            disabled={!autoRefresh}
          />
        </div>
        
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          onClick={fetchLogs}
        >
          手动刷新
        </button>
      </div>
      
      <div 
        ref={logContainerRef}
        className="bg-gray-800 rounded-lg p-4 h-[calc(100vh-220px)] overflow-y-auto font-mono text-sm"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">没有找到日志记录</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">时间</th>
                <th className="text-left p-2 w-20">级别</th>
                <th className="text-left p-2">来源</th>
                <th className="text-left p-2">消息</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="p-2 whitespace-nowrap text-gray-400">{formatTimestamp(log.timestamp)}</td>
                  <td className={`p-2 ${getLevelColor(log.level)}`}>{log.level.toUpperCase()}</td>
                  <td className="p-2 text-gray-300">{log.source || '-'}</td>
                  <td className="p-2">
                    <div>{log.message}</div>
                    {log.details && (
                      <pre className="mt-1 text-xs text-gray-400 whitespace-pre-wrap">{log.details}</pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 