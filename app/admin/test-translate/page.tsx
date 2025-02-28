'use client';

import { useState } from 'react';

export default function TestTranslatePage() {
  const [text, setText] = useState('Hello, world!');
  const [targetLang, setTargetLang] = useState('zh');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleTranslate = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/test-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, targetLang })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">翻译服务测试</h1>
      
      <div className="mb-4">
        <label className="block mb-2">
          测试文本:
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 border rounded mt-1"
            rows={3}
          />
        </label>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">
          目标语言:
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="ml-2 p-1 border rounded"
          >
            <option value="zh">中文 (zh)</option>
            <option value="en">英文 (en)</option>
            <option value="ja">日文 (ja)</option>
            <option value="ko">韩文 (ko)</option>
          </select>
        </label>
      </div>
      
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400 mb-4"
      >
        {loading ? '翻译中...' : '测试翻译'}
      </button>
      
      {result && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">翻译结果:</h3>
          
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              <div className="mb-2">
                <strong>原文:</strong> {result.original}
              </div>
              <div className="mb-2">
                <strong>翻译:</strong> {result.translated}
              </div>
              <div>
                <strong>状态:</strong>{' '}
                {result.success ? (
                  <span className="text-green-500">成功</span>
                ) : (
                  <span className="text-red-500">失败 (翻译结果与原文相同)</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">说明:</h3>
        <ul className="list-disc pl-5">
          <li>本应用使用Google免费翻译API，无需API密钥</li>
          <li>如无法访问Google服务，可在设置中配置代理</li>
          <li>免费API可能有访问频率限制，过度使用可能会被临时封禁</li>
          <li>翻译结果与Google翻译网页版相同</li>
        </ul>
      </div>
    </div>
  );
} 