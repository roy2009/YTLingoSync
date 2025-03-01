# YouTube API 配额跟踪功能说明

## 概述

YouTube Data API v3 对每个项目都有每日配额限制，默认为 10,000 单位。不同类型的请求消耗不同的配额单位。为了更好地监控和管理API使用情况，我们实现了一套配额跟踪系统。

## 功能特性

1. **实时配额统计**：记录各种API调用的配额消耗
2. **会话与每日用量区分**：分别跟踪当前会话和每日累计用量
3. **自动重置**：根据YouTube配额重置时间（太平洋时间午夜）自动重置计数
4. **操作历史**：记录最近的API调用，包括操作类型、时间和消耗的配额
5. **可视化界面**：直观显示配额使用情况，带有进度条和警告色彩

## 实现模块

### 1. 配额跟踪核心 (`lib/quota-tracker.ts`)

- 定义各API操作的配额成本常量
- 维护全局配额状态对象
- 提供配额操作记录功能
- 提供配额查询和重置接口

### 2. API端点 (`app/api/quota/route.ts`)

- GET：获取当前配额使用状况
- POST：提供重置会话配额等操作

### 3. UI组件 (`app/components/QuotaStatus.tsx`)

- 直观展示配额使用情况
- 进度条显示使用百分比，颜色根据使用程度变化
- 展示最近操作历史
- 提供手动刷新和重置功能

## 配额消耗规则

当前跟踪的API操作及其配额消耗：

| 操作类型 | 端点 | 配额消耗 |
|---------|------|--------|
| READ_OPERATION | 通用读取操作 | 1 |
| SEARCH_OPERATION | search.list | 100 |
| VIDEOS_LIST | videos.list | 1 |
| CHANNELS_LIST | channels.list | 1 |
| PLAYLISTS_LIST | playlists.list | 1 |
| PLAYLIST_ITEMS_LIST | playlistItems.list | 1 |

## 使用方法

### 在API调用处集成

```typescript
import { trackApiOperation } from '@/lib/quota-tracker';

// 记录API调用配额
trackApiOperation('SEARCH_OPERATION', 'search.list');

// 进行API调用
const response = await http.get(`https://www.googleapis.com/youtube/v3/search?...`);
```

### 展示配额信息

在需要展示配额信息的页面引入组件：

```tsx
import QuotaStatus from '@/app/components/QuotaStatus';

// 在页面中使用
<QuotaStatus />
```

## 未来改进计划

1. 持久化存储配额信息，重启服务后保持计数
2. 基于配额使用情况实现自动限速和请求队列
3. 多API密钥轮换功能，自动切换到未达到限制的API密钥
4. 用户可配置的预警阈值，接近限制时发送通知
5. 基于历史使用模式的预测分析 