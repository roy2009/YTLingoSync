'use client';

import { useState } from 'react';
import UpdateMissingData from './components/UpdateMissingData';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">管理面板</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UpdateMissingData />
        <Link href="/admin/translate-videos" className="card hover:shadow-lg transition-shadow">
          <div className="p-5">
            <h2 className="text-xl font-semibold mb-2">批量翻译视频</h2>
            <p className="text-gray-600 dark:text-gray-400">
              为已有视频添加标题和描述翻译
            </p>
          </div>
        </Link>
        <Link href="/admin/fix-translations" className="card hover:shadow-lg transition-shadow">
          <div className="p-5">
            <h2 className="text-xl font-semibold mb-2">修复视频翻译</h2>
            <p className="text-gray-600 dark:text-gray-400">
              批量修复未翻译的视频标题和描述
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
} 