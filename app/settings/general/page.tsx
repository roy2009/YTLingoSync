/**
 * @file 通用设置页面组件
 * @description 系统基础配置项的设置页面，包括应用名称、默认语言和API密钥等
 */

'use client';

import SettingsPageTemplate from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';
import type { SettingField } from '../components/SettingsPageTemplate';

/**
 * @component GeneralSettingsPage
 * @description 通用设置页面组件，使用SettingsPageTemplate渲染配置表单
 * @returns {JSX.Element} 通用设置页面
 */
export default function GeneralSettingsPage() {
  // 定义通用设置字段配置
  const fields: SettingField[] = [
    {
      id: 'APP_NAME',
      label: '应用名称',
      type: 'text' as const,
      placeholder: '您的应用名称',
      description: '显示在浏览器标题和界面中的应用名称'
    },
    {
      id: 'DEFAULT_LANGUAGE',
      label: '默认语言',
      type: 'select' as const,
      options: [
        { value: 'zh-CN', label: '简体中文' },
        { value: 'en', label: '英文' }
      ],
      description: '应用的默认显示语言'
    },
    {
      id: 'YOUTUBE_API_KEY',
      label: 'YouTube API Key',
      type: 'password' as const,
      placeholder: '输入您的 YouTube API Key',
      description: '用于访问 YouTube Data API 的密钥'
    }
  ];
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.GENERAL}
      fields={fields}
    />
  );
}