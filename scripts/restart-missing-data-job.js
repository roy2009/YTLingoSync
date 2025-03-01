// 重启翻译排队视频任务的脚本
const http = require('http');

logger.debug('正在重启翻译排队视频任务...');

// 创建请求选项
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/restart-missing-data-job',
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
        logger.debug('✅ 成功:', response.message);
      } else {
        console.error('❌ 失败:', response.message || response.error);
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