import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeApp } from './lib/init';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 服务启动时立即调用初始化函数
  console.log('服务器启动中，正在初始化应用...');
  initializeApp().then((success) => {
    if (success) {
      console.log('应用初始化成功！');
    } else {
      console.error('应用初始化失败！请检查日志');
    }
  }).catch(err => {
    console.error('应用初始化过程中发生错误:', err);
  });

  // 创建服务器并处理请求
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('内部服务器错误');
    }
  }).listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`> 服务器已启动，监听端口: ${port}`);
  });
}); 