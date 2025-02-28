'use client';

import { useState } from 'react';

export default function TranslateVideosPage() {
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState('');
  const [limit, setLimit] = useState(10);
  const [translationResults, setTranslationResults] = useState([]);
  
  const handleTranslate = async () => {
    setTranslating(true);
    setResult('正在翻译...');
    setTranslationResults([]);
    
    try {
      const response = await fetch('/api/admin/translate-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.message);
        if (data.results) {
          setTranslationResults(data.results);
        }
      } else {
        setResult(`错误: ${data.error || data.message || '未知错误'}`);
      }
    } catch (error) {
      setResult(`请求失败: ${error.message}`);
    } finally {
      setTranslating(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">批量翻译视频</h1>
      
      <div className="mb-4">
        <label className="block mb-2">
          每次翻译数量:
          <input 
            type="number" 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            className="ml-2 p-1 border rounded"
            min="1"
            max="100"
          />
        </label>
        
        <button
          onClick={handleTranslate}
          disabled={translating}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
        >
          {translating ? '翻译中...' : '开始翻译'}
        </button>
      </div>
      
      {result && (
        <div className="p-4 bg-gray-100 rounded mb-4">
          <p>{result}</p>
        </div>
      )}
      
      {translationResults.length > 0 && (
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
              {translationResults.map((item, i) => (
                <tr key={i} className={`border-t ${item.status === 'success' ? 'bg-green-50' : item.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{
                    item.status === 'success' ? '成功' : 
                    item.status === 'warning' ? '警告' : '失败'
                  }</td>
                  <td className="px-4 py-2">{item.original || '-'}</td>
                  <td className="px-4 py-2">{item.translated || item.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">故障排除</h2>
        <ul className="list-disc pl-5">
          <li>确保在设置页面已选择翻译服务</li>
          <li>如果使用Google免费翻译，确保网络能正常访问Google</li>
          <li>如访问受限，可在设置中配置代理</li>
          <li>同一IP频繁调用可能会被临时限制</li>
        </ul>
      </div>
    </div>
  );
} 