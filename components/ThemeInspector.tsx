'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeInspector() {
  const { theme, isClient } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [htmlClasses, setHtmlClasses] = useState<string[]>([]);
  
  useEffect(() => {
    if (!isClient) return;
    
    // 检测暗黑模式
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    // 获取HTML元素上的所有类
    setHtmlClasses(Array.from(document.documentElement.classList));
    
    // 设置一个观察器来监测类变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
          setHtmlClasses(Array.from(document.documentElement.classList));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, [isClient]);
  
  if (!isClient) return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg shadow-lg text-xs z-50 max-w-xs backdrop-blur-sm">
      <h4 className="font-bold mb-1">主题调试器</h4>
      <p>当前主题: <span className="font-mono">{theme}</span></p>
      <p>暗黑模式: <span className="font-mono">{isDarkMode ? '开启' : '关闭'}</span></p>
      <p>HTML类:</p>
      <ul className="mt-1 space-y-1">
        {htmlClasses.map((cls, i) => (
          <li key={i} className="font-mono">{cls}</li>
        ))}
      </ul>
    </div>
  );
} 