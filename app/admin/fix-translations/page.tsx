'use client';

import { useState } from 'react';

export default function FixTranslationsPage() {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState('');
  const [fixedResults, setFixedResults] = useState([]);
  
  const handleFix = async () => {
    setFixing(true);
    setResult('正在修复翻译...');
    setFixedResults([]);
    
    try {
      const response = await fetch('/api/admin/fix-translations', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.message);
        if (data.results) {
          setFixedResults(data.results);
        }
      } else {
        setResult(`错误: ${data.error || data.message || '未知错误'}`);
      }
    } catch (error) {
      setResult(`请求失败: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">修复视频翻译</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          此工具可以帮助您修复之前未被翻译的视频标题和描述。每次将处理最多10个视频。
        </p>
        
        <button
          onClick={handleFix}
          disabled={fixing}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
        >
          {fixing ? '修复中...' : '修复缺失的翻译'}
        </button>
      </div>
      
      {result && (
        <div className="p-4 bg-gray-100 rounded mb-4">
          <p>{result}</p>
        </div>
      )}
      
      {fixedResults.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">视频ID</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-left">原标题</th>
                <th className="px-4 py-2 text-left">翻译后</th>
              </tr>
            </thead>
            <tbody>
              {fixedResults.map((item, i) => (
                <tr key={i} className={`border-t ${item.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{
                    item.status === 'success' ? '成功' : '失败'
                  }</td>
                  <td className="px-4 py-2">{item.title || '-'}</td>
                  <td className="px-4 py-2">{item.titleZh || item.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 