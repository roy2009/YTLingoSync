import { useState } from 'react';
import AlertMessage from '../../components/AlertMessage';
import TestLogs from '../../components/TestLogs';
import { NewSubscription, TestResult, TestVideo } from '../../types/subscription';
import { formatDuration } from '../../utils/formatters';

interface AddSubscriptionFormProps {
  onAdd: (
    newSubscription: NewSubscription, 
    setAddLogs: React.Dispatch<React.SetStateAction<string[]>>,
    setAddingStage: React.Dispatch<React.SetStateAction<string>>
  ) => Promise<boolean>;
  onTest: (subscription: NewSubscription) => Promise<[TestResult | null, string, string[]]>;
  message: { type: string; text: string };
  onMessageChange: (message: { type: string; text: string }) => void;
}

export default function AddSubscriptionForm({
  onAdd,
  onTest,
  message,
  onMessageChange
}: AddSubscriptionFormProps) {
  const [newSubscription, setNewSubscription] = useState<NewSubscription>({
    type: 'channel',
    sourceId: '',
    maxDurationForTranslation: null,
    targetLanguage: 'Chinese',
    autoTranslate: true,
    initialFetchCount: 5
  });
  
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  
  // 添加过程状态
  const [addLogs, setAddLogs] = useState<string[]>([]);
  const [addingStage, setAddingStage] = useState('');

  // 处理测试连接
  const handleTest = async () => {
    if (!newSubscription.sourceId) return;

    setTesting(true);
    setTestError('');
    setTestLogs(['开始测试YouTube API连接...']);
    setTestResult(null);

    try {
      const [result, error, logs] = await onTest(newSubscription);
      setTestLogs(logs);
      
      if (error) {
        setTestError(error);
        return;
      }
      
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  // 处理添加订阅
  const handleAdd = async () => {
    if (!newSubscription.sourceId) return;
    
    setAdding(true);
    onMessageChange({ type: '', text: '' });
    setAddLogs(['开始添加新订阅...']);
    setAddingStage('validating');
    
    try {
      const success = await onAdd(newSubscription, setAddLogs, setAddingStage);
      
      if (success) {
        // 重置表单
        setNewSubscription({ 
          type: 'channel', 
          sourceId: '',
          maxDurationForTranslation: null,
          targetLanguage: 'Chinese',
          autoTranslate: true,
          initialFetchCount: 5
        });
      }
    } finally {
      setAdding(false);
      setAddingStage('');
    }
  };

  return (
    <div className="mb-8 card card-body">
      <h2 className="text-lg font-semibold mb-4">添加新订阅</h2>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <select
              value={newSubscription.type}
              onChange={(e) => setNewSubscription({ ...newSubscription, type: e.target.value })}
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
              onChange={(e) => setNewSubscription({ ...newSubscription, sourceId: e.target.value })}
              className="form-input"
              disabled={adding}
            />
          </div>
        </div>

        {/* 翻译设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">目标语言</label>
            <select
              value={newSubscription.targetLanguage}
              onChange={(e) => setNewSubscription({ ...newSubscription, targetLanguage: e.target.value })}
              className="form-select w-full"
              disabled={adding}
            >
              <option value="Chinese">中文</option>
              <option value="English">英语</option>
              <option value="Japanese">日语</option>
              <option value="Korean">韩语</option>
              <option value="French">法语</option>
              <option value="German">德语</option>
              <option value="Spanish">西班牙语</option>
              <option value="Russian">俄语</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">最大翻译时长 (分钟)</label>
            <input
              type="number"
              placeholder="不限制"
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) * 60 : null;
                setNewSubscription({ ...newSubscription, maxDurationForTranslation: value });
              }}
              className="form-input w-full"
              disabled={adding}
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">留空表示不限制，超过此时长的视频将不会自动翻译</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">首次同步视频数量</label>
            <input
              type="number"
              placeholder="5"
              value={newSubscription.initialFetchCount}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : 5;
                setNewSubscription({ ...newSubscription, initialFetchCount: value });
              }}
              className="form-input w-full"
              disabled={adding}
              min="1"
              max="50"
            />
            <p className="text-xs text-gray-500 mt-1">首次订阅时获取的最新视频数量（最大50个）</p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newSubscription.autoTranslate}
                onChange={(e) => setNewSubscription({ ...newSubscription, autoTranslate: e.target.checked })}
                className="form-checkbox"
                disabled={adding}
              />
              <span>自动翻译新视频</span>
            </label>
          </div>
        </div>

        <div className="flex space-x-2 mt-2">
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
                {testResult.videos.slice(0, 3).map((video: TestVideo) => (
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
              <div className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${addingStage === 'validating' ? 'bg-blue-500 animate-pulse w-1/3' :
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
            onClose={() => onMessageChange({ type: '', text: '' })}
          />
        </div>
      )}
    </div>
  );
} 