'use client';

import SettingsPageTemplate, { SettingField } from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';
import { useNotification } from '../../components/NotificationContext';
import { useState } from 'react';

export default function HeyGenSettingsPage() {
  const { showNotification } = useNotification();
  const [isChecking, setIsChecking] = useState(false);
  const [isDebugChecking, setIsDebugChecking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // 将所有字段组织成分组结构
  const fields: SettingField[] = [
    // HeyGen 相关设置
    {
      id: 'HEYGEN_LOGIN_EMAIL',
      label: 'HeyGen 登录邮箱',
      type: 'email',
      description: 'HeyGen平台的登录邮箱'
    },
    {
      id: 'HEYGEN_LOGIN_PASSWORD',
      label: 'HeyGen 登录密码',
      type: 'password',
      description: 'HeyGen平台的登录密码'
    },
    
    // 邮件服务器设置
    {
      id: 'HEYGEN_EMAIL_HOST',
      label: '邮件服务器地址',
      type: 'text',
      placeholder: 'imap.example.com',
      description: 'IMAP邮件服务器地址'
    },
    {
      id: 'HEYGEN_EMAIL_PORT',
      label: '服务器端口',
      type: 'text',
      placeholder: '993',
      description: 'IMAP服务器端口，通常为993'
    },
    {
      id: 'HEYGEN_EMAIL_USER',
      label: '邮箱账号',
      type: 'email',
      description: '用于接收HeyGen通知的邮箱账号'
    },
    {
      id: 'HEYGEN_EMAIL_PASSWORD',
      label: '邮箱密码',
      type: 'password',
      description: '邮箱密码或应用专用密码'
    },
    {
      id: 'HEYGEN_EMAIL_TLS',
      label: '使用TLS加密',
      type: 'checkbox',
      description: '是否使用TLS加密连接（推荐开启）'
    },
    
    // 定时任务设置
    {
      id: 'HEYGEN_CHECK_INTERVAL',
      label: '邮件检查间隔 (Cron格式)',
      type: 'text',
      placeholder: '*/30 * * * *',
      description: '默认：每30分钟检查一次 (*/30 * * * *)'
    }
  ];
  
  // 检查邮件函数（支持调试模式）
  const handleCheckEmails = async (debugMode = false) => {
    try {
      if (debugMode) {
        setIsDebugChecking(true);
      } else {
        setIsChecking(true);
      }
      
      const response = await fetch('/api/admin/check-heygen-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug: debugMode })
      });
      
      if (response.ok) {
        const result = await response.json();
        showNotification('success', debugMode 
          ? `调试模式邮件检查完成，处理了 ${result.processed} 封邮件，遇到 ${result.errors} 个错误` 
          : `邮件检查完成，处理了 ${result.processed} 封邮件，遇到 ${result.errors} 个错误`);
      } else {
        const error = await response.json();
        showNotification('error', `检查邮件失败: ${error.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('触发邮件检查失败:', error);
      showNotification('error', '触发邮件检查失败');
    } finally {
      if (debugMode) {
        setIsDebugChecking(false);
      } else {
        setIsChecking(false);
      }
    }
  };
  
  // 测试邮件连接
  const testEmailConnection = async () => {
    try {
      setIsTesting(true);
      showNotification('info', '正在测试邮件服务器连接...');
      
      // 获取当前设置值
      const response = await fetch('/api/settings?keys=HEYGEN_EMAIL_HOST,HEYGEN_EMAIL_PORT,HEYGEN_EMAIL_USER,HEYGEN_EMAIL_PASSWORD,HEYGEN_EMAIL_TLS');
      const data = await response.json();
      
      // 提取设置
      const settings: Record<string, string> = {};
      data.settings.forEach((setting: { id: string, value: string }) => {
        settings[setting.id] = setting.value;
      });
      
      // 发送测试请求
      const testResponse = await fetch('/api/admin/test-email-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: settings.HEYGEN_EMAIL_HOST,
          port: parseInt(settings.HEYGEN_EMAIL_PORT) || 993,
          user: settings.HEYGEN_EMAIL_USER,
          password: settings.HEYGEN_EMAIL_PASSWORD,
          tls: settings.HEYGEN_EMAIL_TLS === 'true'
        })
      });
      
      const result = await testResponse.json();
      
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', `连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error('测试邮件连接失败:', error);
      showNotification('error', '测试邮件连接失败');
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.HEYGEN}
      fields={fields}
      onSave={async () => {
        try {
          await fetch('/api/admin/restart-heygen-check', { method: 'POST' });
          showNotification('success', '设置已保存，邮件检查服务已重启');
        } catch (error) {
          console.error('重启邮件检查失败:', error);
          showNotification('error', '重启邮件检查服务失败');
        }
      }}
      additionalButtons={
        <div className="flex space-x-2">
          <button 
            type="button" 
            className="py-2.5 px-5 text-sm font-medium text-blue-300 focus:outline-none bg-blue-900 rounded-lg border border-blue-700 hover:bg-blue-800 hover:text-white focus:z-10 focus:ring-4 focus:ring-blue-700 disabled:opacity-50"
            onClick={testEmailConnection}
            disabled={isTesting}
          >
            {isTesting ? '测试中...' : '测试邮件连接'}
          </button>
          
          <button 
            type="button" 
            className="py-2.5 px-5 text-sm font-medium text-gray-300 focus:outline-none bg-gray-800 rounded-lg border border-gray-600 hover:bg-gray-700 hover:text-white focus:z-10 focus:ring-4 focus:ring-gray-700 disabled:opacity-50"
            onClick={() => handleCheckEmails(false)}
            disabled={isChecking || isDebugChecking || isTesting}
          >
            {isChecking ? '检查中...' : '立即检查邮件'}
          </button>
          
          <button 
            type="button" 
            className="py-2.5 px-5 text-sm font-medium text-purple-300 focus:outline-none bg-purple-900 rounded-lg border border-purple-700 hover:bg-purple-800 hover:text-white focus:z-10 focus:ring-4 focus:ring-purple-700 disabled:opacity-50"
            onClick={() => handleCheckEmails(true)}
            disabled={isChecking || isDebugChecking || isTesting}
          >
            {isDebugChecking ? '检查中...' : '调试模式检查'}
          </button>
        </div>
      }
      additionalInfo={
        <div className="mt-6 p-4 border border-gray-700 rounded-lg bg-gray-800">
          <h3 className="font-medium text-gray-200 mb-2">邮件检查说明</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            <li>系统将自动检查邮箱中来自HeyGen的视频翻译完成通知</li>
            <li>检测到通知后会自动更新视频翻译状态</li>
            <li>请确保使用IMAP协议的邮箱，如Gmail需启用"应用专用密码"</li>
            <li>"调试模式检查"将检查最近的10封邮件（包括已读邮件）</li>
            <li>修改邮件设置后，系统将自动重启邮件检查服务</li>
          </ul>
        </div>
      }
    />
  );
} 