# YTLingoSync - YouTube视频自动同步翻译配音系统

一个自动化同步系统，用于同步订阅的YouTube频道和播放列表，并使用Heygen AI将视频翻译成中文配音。

## 功能特点

- **YouTube集成**: 自动同步频道和播放列表，获取最新视频
- **Heygen AI翻译**: 将YouTube视频内容翻译成中文配音
- **完整用户界面**: 订阅管理、视频列表、系统设置和日志监控
- **队列管理**: 高效处理翻译任务队列
- **实时日志跟踪**: 提供翻译和同步过程的详细日志
- **订阅状态管理**: 支持单独同步和批量更新订阅
- **API密钥管理**: 支持多个YouTube API密钥轮换和配额监控
- **邮件集成**: 自动处理Heygen完成通知邮件

## 技术栈

- **前端**: Next.js 15, React 19, TailwindCSS
- **后端**: Next.js API Routes, 独立Express服务器
- **数据库**: SQLite (通过Prisma ORM)
- **自动化**: node-cron定时任务
- **视频处理**: FFmpeg
- **网页自动化**: Puppeteer (Heygen集成)
- **API路由**: 动态路由参数处理优化
- **UI组件**: Radix UI

## 项目结构

```
YTLingoSync/
├── app/              # Next.js 应用页面和API路由
│   ├── api/          # API端点
│   │   ├── subscriptions/ # 订阅相关API
│   │   ├── videos/   # 视频相关API
│   │   ├── admin/    # 管理功能API
│   ├── admin/        # 管理界面
│   ├── logs/         # 日志页面
│   ├── settings/     # 设置页面
│   ├── subscriptions/ # 订阅管理页面
│   ├── videos/       # 视频列表页面
│   ├── layout.tsx    # 主布局组件
│   └── page.tsx      # 首页
├── components/       # React组件
│   ├── admin/        # 管理界面组件
│   ├── ui/           # UI通用组件
├── contexts/         # React上下文
├── lib/              # 核心功能库
│   ├── heygen.ts     # Heygen AI集成
│   ├── heygen-email-service.ts # Heygen邮件服务
│   ├── youtube-api.ts # YouTube API集成
│   ├── prisma.ts     # Prisma客户端
│   ├── sync-service.ts # 同步服务
│   ├── translate.ts  # 文本翻译服务
│   ├── task-status-service.ts # 任务状态管理
│   ├── logger.ts     # 日志系统
│   └── env-service.ts # 环境变量服务
├── prisma/           # 数据库模型和迁移
│   └── schema.prisma # 数据模型定义
├── public/           # 静态资源
├── scripts/          # 辅助脚本
├── types/            # TypeScript类型定义
├── server.ts         # 独立Express服务器
├── .env              # 环境变量配置
├── package.json      # 项目依赖
└── README.md         # 项目说明文档
```

## 安装指南

### 前提条件

- Node.js 18或更高版本
- 已配置的YouTube Data API密钥
- Heygen账号和密码

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/YTLingoSync.git
   cd YTLingoSync
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建环境变量文件
   ```bash
   cp .env.example .env
   ```

4. 编辑`.env`文件，填写必要的API密钥和配置项

5. 初始化数据库
   ```bash
   npx prisma migrate dev
   ```

6. 启动应用
   ```bash
   npm run dev
   ```

## 配置说明

在`.env`文件中配置以下变量：

```
# 数据库配置
DATABASE_URL="file:./dev.db"

# YouTube API配置
YOUTUBE_API_KEY=your_youtube_api_key_here

# Heygen配置
HEYGEN_LOGIN_EMAIL=your_heygen_email_here
HEYGEN_LOGIN_PASSWORD=your_heygen_password_here

# 系统设置
SYNC_INTERVAL_MINUTES=15
MAX_CONCURRENT_TRANSLATIONS=2
TRANSLATION_SERVICE=google

# 邮件服务配置
EMAIL_SERVER=imap.example.com
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
```

## 使用指南

### 1. 初始设置

1. 访问`http://localhost:3000/settings`配置YouTube API密钥和Heygen账号
2. 保存设置后系统将自动初始化

### 2. 添加订阅

1. 访问`http://localhost:3000/subscriptions`
2. 点击"添加新订阅"
3. 选择订阅类型（频道或播放列表）
4. 输入YouTube频道ID或播放列表ID
5. 设置翻译参数（目标语言、最大时长限制等）
6. 点击"添加订阅"按钮

### 3. 同步订阅

1. 在订阅列表页面找到需要同步的订阅
2. 点击对应的"同步"按钮
3. 系统会显示同步进度和结果日志

### 4. 视频管理

1. 访问`http://localhost:3000/videos`查看所有同步的视频
2. 可以按订阅筛选视频
3. 点击视频旁的"翻译"按钮创建翻译任务

### 5. 监控系统

1. 访问`http://localhost:3000/logs`查看系统日志
2. 可以按日志级别筛选
3. 查看详细错误信息和处理状态

### 6. 管理界面

1. 访问`http://localhost:3000/admin`进入管理界面
2. 查看Heygen翻译队列状态
3. 管理YouTube API密钥和配额

## 自动化

系统将根据配置的间隔时间自动同步订阅和检查新视频。默认为每15分钟同步一次。

若要手动触发同步，可以：

1. 访问订阅列表页面并点击特定订阅的"同步"按钮
2. 或通过API端点触发：`GET /api/cron/sync-all`

## 视频翻译流程

1. 系统同步YouTube频道/播放列表获取新视频元数据
2. 用户选择视频创建翻译任务（或配置自动创建）
3. 视频标题和描述使用配置的翻译服务进行文本翻译
4. 翻译任务进入Heygen队列，通过Puppeteer自动处理
5. 系统使用Puppeteer自动与Heygen交互执行视频配音
6. 翻译完成后，系统自动处理Heygen发送的邮件通知
7. 获取翻译后的视频URL并更新数据库记录

## 常见问题

### 系统不同步新视频

- 检查YouTube API密钥是否有效或是否超出配额
- 确认订阅ID是否正确
- 查看系统日志中的错误信息

### 翻译任务失败

- 检查Heygen账号凭据是否正确
- 确保Heygen账号有足够的余额/积分
- 检查网络连接和防火墙设置

### 视频处理速度慢

- 调整`MAX_CONCURRENT_TRANSLATIONS`设置减少并发任务数
- 检查服务器资源使用情况
- 考虑为长视频增加分段数量减小单个任务大小

### Heygen集成问题

- 确保Puppeteer可以正常运行（服务器需要支持无头浏览器）
- 检查Heygen登录凭据是否正确
- 验证邮件接收配置是否正确

## 未来计划

- **自动分段处理**: 支持长视频自动分段翻译后合并
- **多语言支持**: 扩展支持更多目标语言翻译
- **高级队列管理**: 支持任务优先级和重试机制
- **批量导出**: 支持批量导出翻译后的视频

## 许可证

MIT 