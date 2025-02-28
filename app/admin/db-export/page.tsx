'use client';

import { useState } from 'react';

export default function DbExportPage() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  
  const exportDatabase = async () => {
    setExporting(true);
    setMessage('正在导出数据库...');
    
    try {
      const response = await fetch('/api/admin/db-export');
      const data = await response.json();
      
      // 创建下载链接
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `db-export-${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setMessage('数据库导出成功！');
    } catch (error) {
      console.error('导出数据库失败:', error);
      setMessage('导出失败: ' + error.message);
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">数据库导出</h1>
      
      <button
        onClick={exportDatabase}
        disabled={exporting}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
      >
        {exporting ? '导出中...' : '导出数据库'}
      </button>
      
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
} 