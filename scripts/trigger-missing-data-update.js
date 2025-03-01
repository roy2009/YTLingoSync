// 手动触发翻译排队视频任务脚本
const http = require('http');

logger.debug('正在手动触发翻译排队视频任务...');

// 创建请求选项
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/trigger-missing-data-update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// 发送请求
const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        logger.debug('✅ 执行成功!');
        logger.debug(`更新了 ${response.updated} 条翻译排队视频`);
        logger.debug(`消息: ${response.message}`);
      } else if (res.statusCode === 409) {
        console.warn('⚠️ 警告:', response.message);
        logger.debug('任务已在运行中，请稍后再试');
      } else {
        console.error('❌ 执行失败!');
        console.error(`错误: ${response.error || response.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 解析响应失败:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求错误:', error.message);
  logger.debug('确保应用程序正在运行，端口是否正确？');
});

// 完成请求
req.end(); 