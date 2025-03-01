import { useState } from 'react';
import Link from 'next/link';
import { Subscription } from '../../types/subscription';
import { getColorForPlaylist } from '../../utils/formatters';
import EditSubscriptionForm from './EditSubscriptionForm';
import TestLogs from '../../components/TestLogs';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  loading: boolean;
  onSync: (id: string) => Promise<{ success: boolean; logs: string[]; error?: string }>;
  onEdit: (id: string, editForm: any) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function SubscriptionList({
  subscriptions,
  loading,
  onSync,
  onEdit,
  onDelete
}: SubscriptionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // 处理同步
  const handleSync = async (id: string) => {
    setSyncingId(id);
    setShowSyncLogs(false);
    setSyncLogs([]);
    
    try {
      const result = await onSync(id);
      setSyncLogs(result.logs);
      setShowSyncLogs(true);
    } finally {
      setSyncingId(null);
    }
  };

  // 开始编辑订阅
  const startEdit = (subscription: Subscription) => {
    setEditingId(subscription.id);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <svg className="loading-spinner h-8 w-8 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>暂无订阅内容</p>
        <p className="mt-2 text-sm">添加频道或播放列表开始使用</p>
      </div>
    );
  }

  return (
    <>
      {/* 同步日志 */}
      {showSyncLogs && (
        <div className="mt-4 mb-4">
          <TestLogs logs={syncLogs} loading={false} />
        </div>
      )}
    
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
              editingId === sub.id ? (
                <tr key={sub.id} className="table-row bg-transparent">
                  <td colSpan={5} className="table-cell p-4">
                    <EditSubscriptionForm 
                      subscription={sub}
                      onSave={onEdit}
                      onCancel={cancelEdit}
                    />
                  </td>
                </tr>
              ) : (
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
                      <div>
                        <span className="font-medium">{sub.name}</span>
                        {sub.countryCode && (
                          <span className="text-xs text-gray-500 ml-2">({sub.countryCode})</span>
                        )}
                        <div className="text-xs text-gray-500">
                          {sub.autoTranslate ? '自动翻译' : '不自动翻译'} •
                          {sub.targetLanguage || 'Chinese'} •
                          {sub.maxDurationForTranslation
                            ? `最大${Math.floor(sub.maxDurationForTranslation / 60)}分钟`
                            : '无时长限制'}
                        </div>
                      </div>
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
                        onClick={() => startEdit(sub)}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        编辑
                      </button>
                      <button
                        onClick={() => onDelete(sub.id)}
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
              )
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
} 