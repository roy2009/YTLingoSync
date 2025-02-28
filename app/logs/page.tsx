'use client';

import { useState, useEffect } from 'react';

// 定义日志类型接口
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  source: string;
  details?: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hoveredMessage, setHoveredMessage] = useState<{text: string, x: number, y: number} | null>(null);

  // 获取日志数据
  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch(`/api/logs?level=${filter}&page=${page}`);
        if (response.ok) {
          const data = await response.json();
          if (page === 1) {
            setLogs(data);
          } else {
            setLogs(prev => [...prev, ...data]);
          }
          
          // 如果返回的数量少于预期，说明已经没有更多了
          setHasMore(data.length === 20); // 假设每页20条
        } else {
          setError('获取日志失败');
        }
      } catch (error) {
        setError('获取日志失败');
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [filter, page]);

  // 处理过滤器变化
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
    setPage(1);
    setHasMore(true);
  };

  // 加载更多日志
  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  // 获取日志级别样式
  const getLevelStyle = (level: string) => {
    const styles = {
      'info': 'badge-info',
      'warn': 'badge-warning',
      'error': 'badge-error',
      'debug': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    
    return styles[level.toLowerCase() as keyof typeof styles] || styles.info;
  };

  // 处理鼠标悬停事件
  const handleMessageHover = (event: React.MouseEvent, message: string) => {
    if (message.length > 50) { // 只在消息较长时显示提示
      setHoveredMessage({
        text: message,
        x: event.clientX,
        y: event.clientY
      });
    }
  };

  // 处理鼠标离开事件
  const handleMessageLeave = () => {
    setHoveredMessage(null);
  };

  if (loading && page === 1) {
    return (
      <div className="page-container">
        <div className="content-container">
          <h1 className="page-title">系统日志</h1>
          <div className="text-center py-8">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="page-title">系统日志</h1>
          
          <div className="mt-3 sm:mt-0">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="all">全部日志</option>
              <option value="info">信息</option>
              <option value="warn">警告</option>
              <option value="error">错误</option>
              <option value="debug">调试</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        
        <div className="card">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>暂无日志记录</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr className="table-header">
                      <th className="table-header-cell">
                        时间
                      </th>
                      <th className="table-header-cell">
                        级别
                      </th>
                      <th className="table-header-cell">
                        消息
                      </th>
                      <th className="table-header-cell">
                        来源
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map(log => (
                      <tr key={log.id} className="table-row">
                        <td className="table-cell">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${getLevelStyle(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="max-w-lg relative">
                            <p 
                              className="truncate cursor-help" 
                              onMouseEnter={(e) => handleMessageHover(e, log.message)}
                              onMouseLeave={handleMessageLeave}
                            >
                              {log.message}
                            </p>
                            {log.details && (
                              <details className="mt-1">
                                <summary className="text-xs text-blue-500 cursor-pointer">查看详情</summary>
                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                                  {typeof log.details === 'object' 
                                    ? JSON.stringify(log.details, null, 2) 
                                    : log.details}
                                </pre>
                              </details>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          {log.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {hasMore && (
                <div className="card-footer text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 悬停提示框 */}
      {hoveredMessage && (
        <div 
          className="fixed z-50 max-w-md p-2 bg-blue-500 text-white shadow-lg rounded border border-blue-600 text-sm"
          style={{
            top: hoveredMessage.y + 20 + 'px',
            left: hoveredMessage.x + 'px',
            transform: 'translateX(-50%)'
          }}
        >
          {hoveredMessage.text}
        </div>
      )}
    </div>
  );
}