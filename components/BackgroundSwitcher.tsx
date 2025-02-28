'use client';

import { useState, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import StarfieldBackground from './StarfieldBackground';
import MatrixCodeRain from './MatrixCodeRain';
import GalaxyBackground from './GalaxyBackground';
import NetworkFlowBackground from './NetworkFlowBackground';

// 创建背景上下文
type BackgroundType = 'starfield' | 'matrix' | 'galaxy' | 'network';

interface BackgroundContextType {
  background: BackgroundType;
  setBackground: (background: BackgroundType) => void;
  isClient: boolean;
}

const BackgroundContext = createContext<BackgroundContextType>({
  background: 'starfield',
  setBackground: () => {},
  isClient: false
});

// 背景提供者组件
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [background, setBackground] = useState<BackgroundType>('starfield');
  const [isClient, setIsClient] = useState(false);
  
  // 客户端渲染检测
  useEffect(() => {
    setIsClient(true);
    
    // 从本地存储加载背景设置
    const savedBackground = localStorage.getItem('background');
    if (savedBackground && ['starfield', 'matrix', 'galaxy', 'network'].includes(savedBackground)) {
      setBackground(savedBackground as BackgroundType);
    }
  }, []);
  
  // 保存背景设置到本地存储
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('background', background);
    }
  }, [background, isClient]);
  
  return (
    <BackgroundContext.Provider value={{ background, setBackground, isClient }}>
      {children}
      {isClient && (
        <>
          {background === 'starfield' && <StarfieldBackground />}
          {background === 'matrix' && <MatrixCodeRain />}
          {background === 'galaxy' && <GalaxyBackground />}
          {background === 'network' && <NetworkFlowBackground />}
        </>
      )}
    </BackgroundContext.Provider>
  );
}

// 使用背景的钩子
export const useBackground = () => useContext(BackgroundContext);

// 背景切换器组件
export default function BackgroundSwitcher() {
  const { background, setBackground, isClient } = useBackground();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 背景选项配置
  const backgrounds = [
    { id: 'starfield', name: '星空', icon: '✨' },
    { id: 'matrix', name: '矩阵', icon: '🖥️' },
    { id: 'galaxy', name: '银河', icon: '🌌' },
    { id: 'network', name: '网络', icon: '🕸️' }
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
  
  // 切换背景
  const handleBackgroundChange = (backgroundId: BackgroundType) => {
    setBackground(backgroundId);
    setIsOpen(false);
  };
  
  // 获取当前背景对象
  const currentBackground = backgrounds.find(b => b.id === background) || backgrounds[0];
  
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
        className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors
                  hover:bg-[rgba(var(--accent-color),0.05)] text-gray-200
                  focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-color),0.3)]"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg mr-1">{currentBackground.icon}</span>
        <span className="text-sm hidden sm:inline-block">{currentBackground.name}</span>
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
          aria-labelledby="background-menu"
        >
          {backgrounds.map((backgroundOption) => (
            <button
              key={backgroundOption.id}
              onClick={() => handleBackgroundChange(backgroundOption.id as BackgroundType)}
              className={`flex items-center px-4 py-2 text-sm w-full text-left transition-colors
                        hover:bg-gray-100/80 dark:hover:bg-gray-700/80
                        ${background === backgroundOption.id ? 'bg-gray-100/80 dark:bg-gray-700/80 font-medium' : ''}`}
              role="menuitem"
            >
              <span className="text-lg mr-2">{backgroundOption.icon}</span>
              <span>{backgroundOption.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}