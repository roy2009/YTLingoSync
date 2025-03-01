import { useState, useEffect } from 'react';

export default function UpdateMissingData() {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  
  // 获取缺少时长的视频数量
  const fetchMissingCount = async () => {
    try {
      // 使用相对URL，确保在客户端正确解析
      const response = await fetch('/api/admin/missing-count');
      if (response.ok) {
        const data = await response.json();
        setRemainingCount(data.count);
      }
    } catch (error) {
      console.error('获取统计信息失败', error);
    }
  };
  
  // 组件加载时获取一次 - 使用useEffect而不是useState
  useEffect(() => {
    fetchMissingCount();
  }, []);
  
  const handleUpdate = async () => {
    setUpdating(true);
    setMessage('正在更新...');
    
    try {
      const response = await fetch('/api/admin/update-missing-data', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || '更新成功，缺失的视频信息已更新');
        // 重新获取剩余数量
        fetchMissingCount();
      } else {
        const data = await response.json();
        setMessage(`更新失败: ${data.error}`);
      }
    } catch (error) {
      setMessage('请求失败，请检查网络连接');
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="card p-4 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-medium mb-3">更新缺失视频信息</h3>
      <p className="text-sm text-gray-500 mb-4">
        更新数据库中缺失时长等信息的视频，每次处理最多50个视频。
        {remainingCount !== null && (
          <span className="block mt-1">
            当前还有 <strong>{remainingCount}</strong> 个视频缺少时长信息
          </span>
        )}
      </p>
      <button 
        onClick={handleUpdate}
        disabled={updating || (remainingCount !== null && remainingCount === 0)}
        className={`btn ${
          remainingCount !== null && remainingCount === 0
            ? 'btn-disabled'
            : 'btn-primary'
        }`}
      >
        {updating ? '更新中...' : remainingCount === 0 ? '无需更新' : '开始更新'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${
          message.includes('失败') ? 'text-red-500' : 'text-green-500'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
} 