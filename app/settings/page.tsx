/**
 * @file 设置首页组件
 * @description 系统设置的主入口页面，展示所有可配置的设置类别
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AlertMessage from '@/components/AlertMessage';
import Link from 'next/link';
import { CATEGORY_LAYOUTS, SETTING_CATEGORIES } from '@/lib/settings';

/**
 * @component SettingsIndexPage
 * @description 设置首页组件，展示所有设置类别的导航卡片
 * @returns {JSX.Element} 设置首页界面
 */
export default function SettingsIndexPage() {
  const router = useRouter();
  
  // 可选：自动重定向到通用设置页面
  useEffect(() => {
    // router.push('/settings/general');
  }, [router]);
  
  return (
    <div className="settings-index">
      <h1 className="text-2xl font-bold text-gray-100">系统设置</h1>
      <p className="text-gray-300">管理系统各部分的配置</p>
      
      {/* 设置类别导航网格 */}
      <div className="settings-grid">
        {Object.entries(CATEGORY_LAYOUTS).map(([category, info]) => (
          <Link href={`/settings/${category}`} key={category} className="settings-card">
            <h2>{info.title}</h2>
            <p>{info.description}</p>
          </Link>
        ))}
        
        {/* 系统日志入口 */}
        <Link href="/admin/logs" className="settings-card">
          <h2>系统日志</h2>
          <p>查看实时系统日志，帮助调试和监控系统运行情况</p>
        </Link>
      </div>
      
      {/* 设置说明提示 */}
      <div className="settings-tip">
        <h3>如何生效设置？</h3>
        <p>
          大多数设置保存后立即生效。邮件检查相关设置需要重启邮件检查服务。
          您可以在HeyGen设置页面中手动执行"立即检查邮件"来测试设置。
        </p>
      </div>
    </div>
  );
}