'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AlertMessage from '@/components/AlertMessage';
import TestLogs from '@/components/TestLogs';

interface Subscription {
  id: string;
  name: string;
  type: string;
  sourceId: string;
  lastSync: string;
  thumbnailUrl?: string;
  _count: {
    videos: number;
  };
}

interface TestVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
}

interface TestResult {
  success: boolean;
  name: string;
  logoUrl?: string;
  videos: TestVideo[];
  logs: string[];
}

// 为播放列表分配一个固定颜色，使每个播放列表有唯一且一致的颜色
function getColorForPlaylist(id: string): string {
  // 从播放列表ID生成一个数字
  const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 根据这个数字选择一种颜色
  const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
  return colors[num % colors.length];
}

// 添加时长格式化函数
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSubscription, setNewSubscription] = useState({
    type: 'channel',
    sourceId: ''
  });
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 测试相关状态
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState('');
  const [testLogs, setTestLogs] = useState<string[]>([]);
  
  // 添加订阅相关状态 - 移动到组件顶层
  const [addLogs, setAddLogs] = useState<string[]>([]);
  const [addingStage, setAddingStage] = useState('');

  // 同步相关状态
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // 获取订阅列表
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      } else {
        setError('获取订阅失败');
      }
    } catch (error) {
      console.error('获取订阅列表错误:', error);
      setError('获取订阅失败');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // 处理测试连接
  const handleTest = async () => {
    if (!newSubscription.sourceId) return;
    
    setTesting(true);
    setTestError('');
    setTestLogs(['开始测试YouTube API连接...']);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/subscriptions/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription),
      });
      
      const data = await response.json();
      
      // 添加服务器返回的日志
      if (data.logs && data.logs.length > 0) {
        setTestLogs(data.logs);
      }
      
      if (!response.ok) {
        setTestError(data.error || '测试连接失败');
        return;
      }
      
      setTestResult(data);
    } catch (error) {
      console.error('测试连接错误:', error);
      setTestError('请求失败，请检查网络连接');
    } finally {
      setTesting(false);
    }
  };

  // 处理添加订阅 - 实现实时过程显示
  const handleAdd = async () => {
    if (!newSubscription.sourceId) return;
    
    setAdding(true);
    setMessage({ type: '', text: '' });
    setAddLogs(['开始添加新订阅...']);
    setAddingStage('validating');
    
    try {
      // 步骤1: 验证输入
      setAddLogs(prev => [...prev, `正在验证${newSubscription.type === 'channel' ? '频道' : '播放列表'}ID...`]);
      await new Promise(r => setTimeout(r, 300)); // 视觉延迟
      
      // 步骤2: 发送添加请求
      setAddLogs(prev => [...prev, '正在创建订阅...' ]);
      setAddingStage('creating');
      
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription),
      });
      
      const data = await response.json();
      
      // 添加服务器返回的日志信息
      if (data.logs && data.logs.length > 0) {
        setAddLogs(prev => [...prev, ...data.logs.filter((log: string) => !prev.includes(log))]);
      }
      
      if (response.ok) {
        setMessage({ type: 'success', text: '订阅添加成功' });
        setNewSubscription({ type: 'channel', sourceId: '' });
        await fetchSubscriptions();
      } else {
        setAddLogs(prev => [...prev, `❌ 添加订阅失败: ${data.error || '未知错误'}`]);
        setMessage({ type: 'error', text: data.error || '添加订阅失败' });
      }
    } catch (error: unknown) {
      console.error('添加订阅错误:', error);
      setAddLogs(prev => [...prev, `❌ 添加过程出错: ${error instanceof Error ? error.message : '未知错误'}`]);
      setMessage({ type: 'error', text: '添加订阅失败，请稍后重试' });
    } finally {
      setAdding(false);
      setAddingStage('');
    }
  };
  
  // 处理同步
  const handleSync = async (id) => {
    setSyncingId(id);
    setShowSyncLogs(false);
    setSyncLogs([]);
    
    try {
      // 使用修复后的API端点
      const response = await fetch(`/api/subscriptions/${id}/sync`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        fetchSubscriptions(); // 刷新列表
        setSyncLogs(data.logs || []);
        setShowSyncLogs(true);
      } else {
        setError(data.error || '同步失败');
        setSyncLogs(data.logs || []);
        setShowSyncLogs(true);
      }
    } catch (error) {
      console.error('同步请求失败', error);
      setError('同步请求失败');
    } finally {
      setSyncingId(null);
    }
  };
  
  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个订阅吗？相关视频也将被删除。')) {
      return;
    }
    
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: '订阅已删除' });
        
        // 更新订阅列表
        setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || '删除失败' });
      }
    } catch (error) {
      console.error('删除订阅错误:', error);
      setMessage({ type: 'error', text: '删除请求失败' });
    }
  };

  return (
    <div className="page-container">
      <div className="content-container-sm">
        <div className="mb-6">
          <h1 className="page-title">订阅管理</h1>
          
          {/* 添加订阅表单 */}
          <div className="mb-8 card card-body">
            <h2 className="text-lg font-semibold mb-4">添加新订阅</h2>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <select
                  value={newSubscription.type}
                  onChange={(e) => setNewSubscription({...newSubscription, type: e.target.value})}
                  className="form-select w-full"
                  disabled={adding}
                >
                  <option value="channel">YouTube频道</option>
                  <option value="playlist">YouTube播放列表</option>
                </select>
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder={newSubscription.type === 'channel' ? "频道ID" : "播放列表ID"}
                  value={newSubscription.sourceId}
                  onChange={(e) => setNewSubscription({...newSubscription, sourceId: e.target.value})}
                  className="form-input"
                  disabled={adding}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleTest}
                  disabled={!newSubscription.sourceId || adding || testing}
                  className="btn btn-primary"
                >
                  {testing ? (
                    <span className="flex items-center">
                      <svg className="loading-spinner -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      测试中
                    </span>
                  ) : '测试连接'}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newSubscription.sourceId || adding || testing}
                  className="btn btn-success"
                >
                  {adding ? (
                    <span className="flex items-center">
                      <svg className="loading-spinner -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      添加中
                    </span>
                  ) : '添加订阅'}
                </button>
              </div>
            </div>
            
            {/* 测试结果区域 */}
            {testing && testLogs.length > 0 && (
              <div className="mt-4">
                <TestLogs logs={testLogs} loading={testing} />
              </div>
            )}
            
            {testError && !testing && (
              <div className="mt-4">
                <AlertMessage type="error" message={testError} />
              </div>
            )}
            
            {testResult && !testing && (
              <div className="mt-4 p-4 alert-success rounded-md">
                <div className="flex items-center text-green-700 dark:text-green-300 mb-2">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex items-center">
                    {testResult.logoUrl && (
                      <img 
                        src={testResult.logoUrl} 
                        alt="频道Logo" 
                        className="w-8 h-8 mr-2 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium">连接成功: {testResult.name}</span>
                  </div>
                </div>
                
                {testResult.videos && testResult.videos.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">最新视频:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {testResult.videos.slice(0, 3).map(video => (
                        <div key={video.id} className="card p-2 bg-gray-800">
                          <div className="relative pb-[56.25%]">
                            <img 
                              src={video.thumbnail} 
                              alt={video.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2">
                            <h3 className="text-sm font-medium line-clamp-2" title={video.title}>
                              {video.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(video.publishedAt).toLocaleDateString()}
                              {video.duration && (
                                <span> • {formatDuration(video.duration)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 过程状态提示 */}
            {adding && (
              <div className="mt-4">
                <div className="relative">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      addingStage === 'validating' ? 'bg-blue-500 animate-pulse w-1/3' :
                      addingStage === 'creating' ? 'bg-blue-500 w-2/3' :
                      addingStage === 'syncing' ? 'bg-blue-500 w-full' : 'bg-blue-500 w-0'
                    }`}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {addingStage === 'validating' ? '验证信息...' :
                     addingStage === 'creating' ? '创建订阅...' :
                     addingStage === 'syncing' ? '同步视频...' : '处理中...'}
                  </div>
                </div>
                
                {/* 添加过程日志 */}
                {addLogs.length > 0 && (
                  <TestLogs logs={addLogs} loading={adding} />
                )}
              </div>
            )}
            
            {/* 消息提示 */}
            {message.text && (
              <div className="mt-4">
                <AlertMessage 
                  type={message.type as 'success' | 'error' | 'warning' | 'info'} 
                  message={message.text}
                  onClose={() => setMessage({type: '', text: ''})}
                />
              </div>
            )}
          </div>
          
          {/* 同步日志 */}
          {showSyncLogs && (
            <div className="mt-4">
              <TestLogs logs={syncLogs} loading={showSyncLogs} />
            </div>
          )}
          
          {/* 订阅列表 */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">已订阅列表</h2>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <svg className="loading-spinner h-8 w-8 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <p>暂无订阅内容</p>
                <p className="mt-2 text-sm">添加频道或播放列表开始使用</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr className="table-header">
                      <th className="table-header-cell">
                        名称
                      </th>
                      <th className="table-header-cell">
                        类型
                      </th>
                      <th className="table-header-cell">
                        视频数
                      </th>
                      <th className="table-header-cell">
                        最后同步
                      </th>
                      <th className="table-header-cell text-right">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center">
                            {sub.type === 'playlist' ? (
                              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mr-2">
                                <img 
                                  src={`/icons/playlist-color-${getColorForPlaylist(sub.id)}.svg`} 
                                  alt={sub.name} 
                                  className="w-5 h-5"
                                />
                              </div>
                            ) : (
                              <img 
                                src={sub.thumbnailUrl || '/icons/default-channel.svg'} 
                                alt={sub.name} 
                                className="w-8 h-8 mr-2 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/icons/default-channel.svg';
                                }}
                              />
                            )}
                            <span className="font-medium">{sub.name}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          {sub.type === 'channel' ? '频道' : '播放列表'}
                        </td>
                        <td className="table-cell">
                          {sub._count.videos}
                        </td>
                        <td className="table-cell">
                          {sub.lastSync ? new Date(sub.lastSync).toLocaleString() : '从未同步'}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex justify-end space-x-3">
                            <Link 
                              href={`/videos?subscriptionId=${sub.id}`}
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              视频
                            </Link>
                            <button
                              onClick={() => handleSync(sub.id)}
                              disabled={syncingId === sub.id}
                              className={`text-sm flex items-center gap-1 ${
                                syncingId === sub.id
                                  ? 'text-gray-500 cursor-not-allowed'
                                  : 'text-green-400 hover:text-green-300'
                              }`}
                            >
                              {syncingId === sub.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  同步中
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  同步
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 