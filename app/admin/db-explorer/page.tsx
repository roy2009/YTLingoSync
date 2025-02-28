'use client';

import { useState, useEffect } from 'react';

export default function DbExplorerPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // 获取数据库表列表
    async function fetchTables() {
      const response = await fetch('/api/admin/db-tables');
      const data = await response.json();
      setTables(data.tables);
    }
    
    fetchTables();
  }, []);
  
  const fetchTableData = async (tableName) => {
    setLoading(true);
    setSelectedTable(tableName);
    
    try {
      const response = await fetch(`/api/admin/db-records?table=${tableName}`);
      const data = await response.json();
      setRecords(data.records);
    } catch (error) {
      console.error('获取表数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">数据库浏览器</h1>
      
      <div className="flex mb-4">
        {tables.map(table => (
          <button
            key={table}
            onClick={() => fetchTableData(table)}
            className={`mr-2 px-4 py-2 rounded ${selectedTable === table ? 'bg-blue-600' : 'bg-blue-500'}`}
          >
            {table}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div>加载中...</div>
      ) : selectedTable ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">{selectedTable} 表数据</h2>
          <div className="overflow-x-auto">
            {records.length > 0 ? (
              <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                <thead className="bg-gray-700">
                  <tr>
                    {Object.keys(records[0]).map(key => (
                      <th key={key} className="px-4 py-2 text-left text-gray-300">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, i) => (
                    <tr key={i} className="border-t border-gray-700">
                      {Object.values(record).map((value, j) => (
                        <td key={j} className="px-4 py-2 text-gray-300">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>没有数据</p>
            )}
          </div>
        </div>
      ) : (
        <p>选择一个表查看数据</p>
      )}
    </div>
  );
} 