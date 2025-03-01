'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// 定义主题类型
export type ThemeType = 'default' | 'ocean' | 'sunset' | 'forest' | 'neon';

// 定义上下文类型
interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isClient: boolean;
}

// 创建上下文
const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  setTheme: () => {},
  isClient: false
});

// 自定义Hook
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

// 提供者组件
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeType>('default');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 客户端首次渲染完成后设置
    setIsClient(true);
    
    // 从localStorage读取主题设置
    const savedTheme = localStorage.getItem('theme') as ThemeType;
    if (savedTheme && ['default', 'ocean', 'sunset', 'forest', 'neon'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // 保存主题到localStorage
    localStorage.setItem('theme', theme);
    
    // 更新根元素上的主题类名
    document.documentElement.classList.remove('theme-default', 'theme-ocean', 'theme-sunset', 'theme-forest', 'theme-neon');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme, isClient]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isClient }}>
      {children}
    </ThemeContext.Provider>
  );
} 