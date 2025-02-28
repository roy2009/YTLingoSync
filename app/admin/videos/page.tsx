'use client';

import React from 'react';

export default function AdminVideosPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">视频管理</h1>
      
      <div className="bg-yellow-900 border border-yellow-800 text-yellow-200 p-4 rounded-lg mb-6">
        <h3 className="font-medium mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          翻译功能限制通知
        </h3>
        <p className="text-sm ml-7">
          目前翻译功能有以下临时限制：
        </p>
        <ul className="list-disc text-sm ml-12 mt-2">
          <li>仅支持30分钟以内的视频翻译</li>
          <li>暂不支持视频分段翻译</li>
          <li>翻译完成通知将通过邮件发送</li>
        </ul>
      </div>
      
      {/* 这里可以添加视频管理的其他内容 */}
    </div>
  );
}