'use client';

import { useEffect, useState } from 'react';

/**
 * @component AppInitializer
 * @description 应用初始化组件，在客户端加载时调用初始化API
 * 
 * 注意：主要初始化逻辑已在服务器启动时执行（通过server.js）
 * 此组件仅作为备用或在某些特殊情况下使用
 */
export default function AppInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 只在客户端运行，且只初始化一次
    if (typeof window !== 'undefined' && !initialized) {
      // 检查是否需要重新初始化（可以通过localStorage或其他机制设置触发条件）
      const needsReinitialization = false; // 默认不需要重新初始化
      
      if (needsReinitialization) {
        const initializeApp = async () => {
          try {
            logger.debug('正在调用应用初始化API...');
            const response = await fetch('/api/init');
            const data = await response.json();
            
            if (response.ok) {
              logger.debug('应用初始化成功:', data.message);
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
      } else {
        // 服务已在服务器启动时初始化，标记为已初始化
        setInitialized(true);
      }
    }
  }, [initialized]);

  // 这是一个纯功能组件，不渲染任何UI
  return null;
}