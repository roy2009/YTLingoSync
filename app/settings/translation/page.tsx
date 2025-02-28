/**
 * @file 翻译设置页面组件
 * @description 系统翻译服务配置的设置页面，包括翻译服务选择和API密钥配置
 */

'use client';

import SettingsPageTemplate from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';

/**
 * @component TranslationSettingsPage
 * @description 翻译设置页面组件，使用SettingsPageTemplate渲染翻译配置表单
 * @returns {JSX.Element} 翻译设置页面
 */
export default function TranslationSettingsPage() {
  // 定义翻译设置字段配置
  const fields = [
    {
      id: 'TRANSLATION_SERVICE',
      label: '翻译服务',
      type: 'select',
      options: [
        { value: 'none', label: '不使用翻译' },
        { value: 'google', label: 'Google 翻译' }
      ],
      description: '选择用于文本翻译的服务'
    },
    {
      id: 'TRANSLATION_API_KEY',
      label: '翻译 API 密钥',
      type: 'password',
      description: '如使用收费翻译服务，请填写API密钥'
    }
  ];
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.TRANSLATION}
      fields={fields}
    />
  );
}