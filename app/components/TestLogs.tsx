import React from 'react';

interface TestLogsProps {
  logs: string[];
  loading?: boolean;
}

export default function TestLogs({ logs, loading = false }: TestLogsProps) {
  return (
    <div className="p-3 bg-gray-800 text-gray-200 rounded-md font-mono text-sm overflow-auto max-h-80">
      {logs.map((log, index) => (
        <div key={index} className="py-0.5">
          {log.startsWith('✅') ? (
            <span className="text-green-400">{log}</span>
          ) : log.startsWith('❌') ? (
            <span className="text-red-400">{log}</span>
          ) : log.startsWith('⚠️') ? (
            <span className="text-yellow-400">{log}</span>
          ) : log.startsWith('ℹ️') ? (
            <span className="text-blue-400">{log}</span>
          ) : (
            <span>{log}</span>
          )}
        </div>
      ))}
      {loading && (
        <div className="py-0.5 flex items-center">
          <div className="animate-pulse flex space-x-2 items-center">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
          </div>
          <span className="ml-2">处理中...</span>
        </div>
      )}
    </div>
  );
} 