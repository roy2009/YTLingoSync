/**
 * @file 翻译设置页面组件
 * @description 系统翻译服务配置的设置页面，包括翻译服务选择和API密钥配置
 */

'use client';

import SettingsPageTemplate, { SettingField } from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';

/**
 * @component TranslationSettingsPage
 * @description 翻译设置页面组件，使用SettingsPageTemplate渲染翻译配置表单
 * @returns {JSX.Element} 翻译设置页面
 */
export default function TranslationSettingsPage() {
  const fields: SettingField[] = [
    {
      id: 'TRANSLATION_SERVICE',
      label: '翻译服务',
      type: 'select',
      options: [
        { value: 'google-free', label: '谷歌翻译 (免费)' },
        { value: 'google-api', label: '谷歌翻译 API (付费)' },
        { value: 'heygen', label: 'HeyGen AI 翻译' },
        { value: 'none', label: '不使用翻译' }
      ],
      description: '选择用于翻译视频标题和描述的服务'
    },
    {
      id: 'TRANSLATION_API_KEY',
      label: '翻译 API 密钥',
      type: 'password',
      description: '如果使用付费API，请输入API密钥'
    }
  ];
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.TRANSLATION}
      fields={fields}
    />
  );
}