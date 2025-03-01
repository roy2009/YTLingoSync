// 使用tsconfig-paths来支持路径映射
require('tsconfig-paths').register({
  baseUrl: './',
  paths: { '@/*': ['./*'] }
});

// 注册ts-node以支持TypeScript
require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.server.json' // 使用服务器特定的TypeScript配置
});

// 导入TypeScript服务器
require('./server.ts'); 