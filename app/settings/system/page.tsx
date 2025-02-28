/**
 * @file 系统设置页面组件
 * @description 系统核心功能配置的设置页面，包括日志级别、维护模式和缓存管理等
 */

'use client';

import SettingsPageTemplate from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';
import { useNotification } from '../../components/NotificationContext';

/**
 * @component SystemSettingsPage
 * @description 系统设置页面组件，使用SettingsPageTemplate渲染系统配置表单
 * @returns {JSX.Element} 系统设置页面
 */
export default function SystemSettingsPage() {
  const { showNotification } = useNotification();
  
  // 定义系统设置字段配置
  const fields = [
    {
      id: 'LOG_LEVEL',
      label: '日志级别',
      type: 'select',
      options: [
        { value: 'error', label: '错误' },
        { value: 'warn', label: '警告' },
        { value: 'info', label: '信息' },
        { value: 'debug', label: '调试' }
      ],
      description: '系统日志记录的详细程度'
    },
    {
      id: 'MAINTENANCE_MODE',
      label: '维护模式',
      type: 'checkbox',
      description: '启用维护模式，暂停自动任务和限制用户操作'
    }
  ];
  
  /**
   * @function handleClearCache
   * @description 处理清除系统缓存的操作
   * @returns {Promise<void>}
   */
  const handleClearCache = async () => {
    try {
      await fetch('/api/admin/clear-cache', { method: 'POST' });
      showNotification('success', '缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
      showNotification('error', '清除缓存失败');
    }
  };
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.SYSTEM}
      fields={fields}
      additionalButtons={
        <button 
          type="button" 
          className="py-2.5 px-5 text-sm font-medium text-gray-300 focus:outline-none bg-gray-800 rounded-lg border border-gray-600 hover:bg-gray-700 hover:text-white focus:z-10 focus:ring-4 focus:ring-gray-700"
          onClick={handleClearCache}
        >
          清除系统缓存
        </button>
      }
    />
  );
}