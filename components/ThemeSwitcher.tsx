'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme, isClient } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 主题选项配置
  const themes = [
    { id: 'default', name: '默认', icon: '🌌' },
    { id: 'ocean', name: '海洋', icon: '🌊' },
    { id: 'sunset', name: '日落', icon: '🌅' },
    { id: 'forest', name: '森林', icon: '🌲' },
    { id: 'neon', name: '霓虹', icon: '🌈' }
  ];
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 切换主题
  const handleThemeChange = (themeId: 'default' | 'ocean' | 'sunset' | 'forest' | 'neon') => {
    setTheme(themeId);
    setIsOpen(false);
  };
  
  // 获取当前主题对象
  const currentTheme = themes.find(t => t.id === theme) || themes[0];
  
  // 如果不是客户端，返回一个简单的占位符
  if (!isClient) {
    return (
      <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
    );
  }
  
  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors
                  bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm
                  hover:bg-white/30 dark:hover:bg-gray-700/30
                  border border-gray-200/50 dark:border-gray-700/50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className="text-sm hidden sm:inline-block">{currentTheme.name}</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md
                    rounded-md shadow-xl z-50 border border-gray-200/50 dark:border-gray-700/50
                    animate-fadeIn origin-top-right"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-menu"
        >
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => handleThemeChange(themeOption.id as any)}
              className={`flex items-center px-4 py-2 text-sm w-full text-left transition-colors
                        hover:bg-gray-100/80 dark:hover:bg-gray-700/80
                        ${theme === themeOption.id ? 'bg-gray-100/80 dark:bg-gray-700/80 font-medium' : ''}`}
              role="menuitem"
            >
              <span className="text-lg mr-2">{themeOption.icon}</span>
              <span>{themeOption.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 