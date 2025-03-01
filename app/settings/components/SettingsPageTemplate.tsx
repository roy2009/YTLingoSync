'use client';

import { useState, useEffect } from 'react';
// 移除 react-hot-toast 导入
// import { toast } from 'react-hot-toast';
import { SETTING_CATEGORIES, getSettingKeysByCategory, CATEGORY_LAYOUTS } from '@/lib/settings';
import { useNotification } from '../../components/NotificationContext';

export interface SettingField {
  id: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'checkbox' | 'select';
  options?: {value: string, label: string}[];
  placeholder?: string;
  description?: string;
}

interface SettingsPageProps {
  category: string;
  fields: SettingField[];
  onSave?: () => Promise<void>;
  additionalButtons?: React.ReactNode;
  additionalInfo?: React.ReactNode;
}

export default function SettingsPageTemplate({ 
  category, 
  fields,
  onSave,
  additionalButtons,
  additionalInfo
}: SettingsPageProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();
  
  // 使用类型断言确保category是有效的键
  const categoryInfo = CATEGORY_LAYOUTS[category as keyof typeof CATEGORY_LAYOUTS];
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  async function fetchSettings() {
    setLoading(true);
    try {
      const keys = getSettingKeysByCategory(category);
      const res = await fetch(`/api/settings?keys=${keys.join(',')}`);
      const data = await res.json();
      
      if (data.settings) {
        const settingsObj = data.settings.reduce((acc: Record<string, string>, item: { id: string, value: string }) => {
          acc[item.id] = item.value;
          return acc;
        }, {});
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      showNotification('error', '加载设置失败');
    } finally {
      setLoading(false);
    }
  }
  
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const settingsToSave = Object.entries(settings).map(([id, value]) => ({
        id,
        value: String(value)
      }));
      
      console.log('正在保存设置:', settingsToSave);
      
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: settingsToSave })
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || '保存设置失败');
      }
      
      showNotification('success', '设置已保存');
      
      // 如果提供了自定义的保存后回调，则执行
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      showNotification('error', error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setSaving(false);
    }
  }
  
  function renderField(field: SettingField) {
    const value = settings[field.id] || '';
    
    switch (field.type) {
      case 'checkbox':
        return (
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id={field.id}
              checked={value === 'true'}
              onChange={e => setSettings({...settings, [field.id]: e.target.checked ? 'true' : 'false'})}
              className="w-4 h-4 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-600"
            />
            <label htmlFor={field.id} className="ml-2 text-sm font-medium text-gray-300">
              {field.label}
            </label>
            {field.description && (
              <p className="mt-1 text-sm text-gray-400">{field.description}</p>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div className="mb-4">
            <label htmlFor={field.id} className="block mb-2 text-sm font-medium text-gray-300">
              {field.label}
            </label>
            <select
              id={field.id}
              value={value}
              onChange={e => setSettings({...settings, [field.id]: e.target.value})}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="mt-1 text-sm text-gray-400">{field.description}</p>
            )}
          </div>
        );
        
      default:
        return (
          <div className="mb-4">
            <label htmlFor={field.id} className="block mb-2 text-sm font-medium text-gray-300">
              {field.label}
            </label>
            <input
              type={field.type}
              id={field.id}
              value={value}
              onChange={e => setSettings({...settings, [field.id]: e.target.value})}
              placeholder={field.placeholder}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
            {field.description && (
              <p className="mt-1 text-sm text-gray-400">{field.description}</p>
            )}
          </div>
        );
    }
  }
  
  return (
    <div className="prose max-w-none dark:prose-invert">
      <h1 className="text-2xl font-bold text-gray-100">{categoryInfo.title}</h1>
      <p className="text-gray-300 mb-6">{categoryInfo.description}</p>
      
      {loading ? (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-300">加载中...</span>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="mt-6">
          {fields.map(field => (
            <div key={field.id}>
              {renderField(field)}
            </div>
          ))}
          
          <div className="mt-8 flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            
            {additionalButtons}
          </div>
          
          {additionalInfo}
        </form>
      )}
    </div>
  );
} 