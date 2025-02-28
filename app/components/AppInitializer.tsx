'use client';

import { useEffect, useState } from 'react';

/**
 * @component AppInitializer
 * @description 应用初始化组件，在客户端加载时调用初始化API
 */
export default function AppInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 只在客户端运行，且只初始化一次
    if (typeof window !== 'undefined' && !initialized) {
      const initializeApp = async () => {
        try {
          console.log('正在调用应用初始化API...');
          const response = await fetch('/api/init');
          const data = await response.json();
          
          if (response.ok) {
            console.log('应用初始化成功:', data.message);
            setInitialized(true);
          } else {
            console.error('应用初始化失败:', data.error);
            setError(data.error);
          }
        } catch (err) {
          console.error('调用初始化API出错:', err);
          setError('无法连接到初始化API');
        }
      };

      initializeApp();
    }
  }, [initialized]);

  // 这是一个纯功能组件，不渲染任何UI
  return null;
}