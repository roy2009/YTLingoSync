'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SettingsLayout from './SettingsLayout';
import LoadingDots from '@/components/LoadingDots';

export default function HeyGenSettingsPage() {
  // 状态管理
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNormalChecking, setIsNormalChecking] = useState(false);
  const [isDebugChecking, setIsDebugChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  
  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings?keys=heygen_email_host,heygen_email_port,heygen_email_user,heygen_email_password,heygen_email_tls,heygen_api_key');
      if (response.ok) {
        const data = await response.json();
        
        // 将设置数组转换为对象
        const settingsObj = {};
        data.settings.forEach(setting => {
          settingsObj[setting.id] = setting.value;
        });
        
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      toast.error('加载设置失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存设置
  const saveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 将设置对象转换回数组格式
      const settingsArray = Object.entries(settings).map(([id, value]) => ({
        id,
        value: String(value)
      }));
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray })
      });
      
      if (response.ok) {
        toast.success('设置已保存');
      } else {
        toast.error('保存设置失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 检查邮件 - 支持正常模式和调试模式
  const checkEmails = async (debugMode = false) => {
    if (debugMode) {
      setIsDebugChecking(true);
    } else {
      setIsNormalChecking(true);
    }
    
    setCheckResult(null);
    
    try {
      const response = await fetch('/api/admin/check-heygen-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug: debugMode })
      });
      
      if (response.ok) {
        const result = await response.json();
        setCheckResult(result);
        toast.success(debugMode ? '调试模式邮件检查完成' : '邮件检查完成');
      } else {
        const error = await response.json();
        toast.error(`检查失败: ${error.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('检查邮件失败:', error);
      toast.error('检查邮件失败');
    } finally {
      if (debugMode) {
        setIsDebugChecking(false);
      } else {
        setIsNormalChecking(false);
      }
    }
  };
  
  // 处理输入变化
  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // TLS选项处理
  const handleTlsChange = (checked) => {
    handleChange('heygen_email_tls', checked ? 'true' : 'false');
  };
  
  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="p-4 flex justify-center">
          <LoadingDots />
        </div>
      </SettingsLayout>
    );
  }
  
  return (
    <SettingsLayout>
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">HeyGen 集成设置</h1>
        
        <form onSubmit={saveSettings}>
          {/* API Key 设置部分 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">API 设置</h2>
            <div className="grid gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  HeyGen API Key
                </label>
                <input
                  type="password"
                  value={settings.heygen_api_key || ''}
                  onChange={(e) => handleChange('heygen_api_key', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="输入您的 HeyGen API Key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  在 HeyGen 开发者设置中获取 API Key
                </p>
              </div>
            </div>
          </div>
          
          {/* 邮件服务设置部分 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">邮件通知设置</h2>
            <div className="grid gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  邮件服务器
                </label>
                <input
                  type="text"
                  value={settings.heygen_email_host || ''}
                  onChange={(e) => handleChange('heygen_email_host', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="例如: imap.example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  端口
                </label>
                <input
                  type="number"
                  value={settings.heygen_email_port || ''}
                  onChange={(e) => handleChange('heygen_email_port', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="例如: 993"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  用户名/邮箱
                </label>
                <input
                  type="text"
                  value={settings.heygen_email_user || ''}
                  onChange={(e) => handleChange('heygen_email_user', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  密码
                </label>
                <input
                  type="password"
                  value={settings.heygen_email_password || ''}
                  onChange={(e) => handleChange('heygen_email_password', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="邮箱密码或应用专用密码"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tlsEnabled"
                  checked={settings.heygen_email_tls === 'true'}
                  onChange={(e) => handleTlsChange(e.target.checked)}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="tlsEnabled" className="text-sm font-medium">
                  启用 TLS 加密
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <LoadingDots /> : '保存设置'}
            </button>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => checkEmails(false)}
                disabled={isNormalChecking || isDebugChecking}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isNormalChecking ? <LoadingDots /> : '立即检查邮件'}
              </button>
              
              <button
                type="button"
                onClick={() => checkEmails(true)}
                disabled={isNormalChecking || isDebugChecking}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isDebugChecking ? <LoadingDots /> : '调试模式检查'}
              </button>
            </div>
          </div>
          
          {checkResult && (
            <div className="mb-6 p-4 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">检查结果：</h3>
              <div className="text-sm">
                <p>处理邮件: {checkResult.processed || 0} 封</p>
                <p>遇到错误: {checkResult.errors || 0} 个</p>
                {checkResult.message && <p className="mt-2">{checkResult.message}</p>}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">邮件设置说明：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>系统会定期检查此邮箱中来自 HeyGen 的视频翻译完成通知</li>
              <li>请确保使用 IMAP 协议的邮箱服务</li>
              <li>如果使用 Gmail，需要启用"应用专用密码"</li>
              <li>"调试模式检查"将检查最近的10封邮件（包括已读邮件）</li>
            </ul>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
} 