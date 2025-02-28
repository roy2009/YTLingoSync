/**
 * @file 代理设置页面组件
 * @description 系统网络代理配置的设置页面，包括代理服务器、认证信息和SSL验证等选项
 */

'use client';

import SettingsPageTemplate from '../components/SettingsPageTemplate';
import { SETTING_CATEGORIES } from '@/lib/settings';

/**
 * @component ProxySettingsPage
 * @description 代理设置页面组件，使用SettingsPageTemplate渲染代理配置表单
 * @returns {JSX.Element} 代理设置页面
 */
export default function ProxySettingsPage() {
  // 定义代理设置字段配置
  const fields = [
    {
      id: 'PROXY_ENABLED',
      label: '启用代理',
      type: 'checkbox',
      description: '是否启用网络代理'
    },
    {
      id: 'PROXY_URL',
      label: '代理服务器',
      type: 'text',
      placeholder: 'http://proxy.example.com:8080',
      description: '代理服务器地址，包含协议和端口'
    },
    {
      id: 'PROXY_USERNAME',
      label: '代理用户名',
      type: 'text',
      description: '如果代理需要认证，请填写用户名'
    },
    {
      id: 'PROXY_PASSWORD',
      label: '代理密码',
      type: 'password',
      description: '如果代理需要认证，请填写密码'
    },
    {
      id: 'VERIFY_SSL',
      label: '验证SSL证书',
      type: 'checkbox',
      description: '是否验证HTTPS请求的SSL证书'
    }
  ];
  
  return (
    <SettingsPageTemplate 
      category={SETTING_CATEGORIES.PROXY}
      fields={fields}
    />
  );
}