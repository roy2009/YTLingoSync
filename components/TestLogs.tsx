import React, { useEffect, useRef } from 'react';

interface TestLogsProps {
  logs: string[];
  loading: boolean;
}

const TestLogs: React.FC<TestLogsProps> = ({ logs, loading }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md mb-4 max-h-48 overflow-y-auto text-xs font-mono">
      {logs.map((log, index) => (
        <div key={index} className={`mb-1 ${
          log.includes('✅') ? 'text-green-600 dark:text-green-400' :
          log.includes('❌') ? 'text-red-600 dark:text-red-400' :
          'text-gray-800 dark:text-gray-300'
        }`}>
          &gt; {log}
        </div>
      ))}
      
      {loading && (
        <div className="text-blue-600 dark:text-blue-400 animate-pulse">
          &gt; 正在处理...
        </div>
      )}
      
      <div ref={logsEndRef} />
    </div>
  );
};

export default TestLogs; 