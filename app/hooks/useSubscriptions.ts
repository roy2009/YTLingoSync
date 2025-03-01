import { useState, useEffect, useCallback } from 'react';
import { Subscription, TestResult, NewSubscription, EditSubscriptionForm } from '@/types/subscription';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // 获取订阅列表
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // 测试连接
  const testConnection = async (newSubscription: NewSubscription): Promise<[TestResult | null, string, string[]]> => {
    const testLogs = ['开始测试YouTube API连接...'];
    
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
      let updatedLogs = testLogs;
      if (data.logs && data.logs.length > 0) {
        updatedLogs = data.logs;
      }

      if (!response.ok) {
        return [null, data.error || '测试连接失败', updatedLogs];
      }

      return [data, '', updatedLogs];
    } catch (error) {
      console.error('测试连接错误:', error);
      return [null, '请求失败，请检查网络连接', testLogs];
    }
  };

  // 添加订阅
  const addSubscription = async (newSubscription: NewSubscription, 
    setAddLogs: React.Dispatch<React.SetStateAction<string[]>>,
    setAddingStage: React.Dispatch<React.SetStateAction<string>>) => {
    try {
      // 步骤1: 验证输入
      setAddLogs(prev => [...prev, `正在验证${newSubscription.type === 'channel' ? '频道' : '播放列表'}ID...`]);
      await new Promise(r => setTimeout(r, 300)); // 视觉延迟
      
      // 步骤2: 发送添加请求
      setAddLogs(prev => [...prev, '正在创建订阅...']);
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
        await fetchSubscriptions();
        return true;
      } else {
        setAddLogs(prev => [...prev, `❌ 添加订阅失败: ${data.error || '未知错误'}`]);
        setMessage({ type: 'error', text: data.error || '添加订阅失败' });
        return false;
      }
    } catch (error: unknown) {
      console.error('添加订阅错误:', error);
      setAddLogs(prev => [...prev, `❌ 添加过程出错: ${error instanceof Error ? error.message : '未知错误'}`]);
      setMessage({ type: 'error', text: '添加订阅失败，请稍后重试' });
      return false;
    }
  };

  // 同步订阅
  const syncSubscription = async (id: string) => {
    const syncLogs: string[] = [];
    
    try {
      const response = await fetch(`/api/subscriptions/${id}/sync`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchSubscriptions(); // 刷新列表
        return { success: true, logs: data.logs || [] };
      } else {
        setError(data.error || '同步失败');
        return { success: false, logs: data.logs || [], error: data.error || '同步失败' };
      }
    } catch (error) {
      console.error('同步请求失败', error);
      setError('同步请求失败');
      return { success: false, logs: syncLogs, error: '同步请求失败' };
    }
  };

  // 删除订阅
  const deleteSubscription = async (id: string) => {
    if (!confirm('确定要删除这个订阅吗？相关视频也将被删除。')) {
      return false;
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
        return true;
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || '删除失败' });
        return false;
      }
    } catch (error) {
      console.error('删除订阅错误:', error);
      setMessage({ type: 'error', text: '删除请求失败' });
      return false;
    }
  };

  // 更新订阅
  const updateSubscription = async (id: string, editForm: EditSubscriptionForm) => {
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '订阅设置已更新' });

        // 更新订阅列表中的项
        setSubscriptions(subscriptions.map(sub =>
          sub.id === id ? { ...sub, ...editForm } : sub
        ));

        return true;
      } else {
        setMessage({ type: 'error', text: data.error || '更新失败' });
        return false;
      }
    } catch (error) {
      console.error('更新订阅错误:', error);
      setMessage({ type: 'error', text: '更新请求失败' });
      return false;
    }
  };

  return {
    subscriptions,
    loading,
    error,
    message,
    setMessage,
    fetchSubscriptions,
    testConnection,
    addSubscription,
    syncSubscription,
    deleteSubscription,
    updateSubscription
  };
} 