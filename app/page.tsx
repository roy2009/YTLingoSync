/**
 * @file 主页面组件
 * @description 展示系统概览和主要功能入口的仪表板页面
 */

import Link from 'next/link';
import SyncCountdown from '../components/SyncCountdown';

/**
 * @function fetchDashboardStats
 * @description 获取仪表板统计数据
 * @returns {Promise<Object>} 包含频道数、视频数、同步状态等统计信息
 */
async function fetchDashboardStats() {
  try {
    // 使用绝对 URL 确保在各种环境下都能正确访问API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      // 使用revalidate缓存策略，每60秒重新验证数据
      next: { revalidate: 60 }
    });
    
    if (!response.ok) {
      console.warn('API返回非成功状态码:', response.status);
      return getMockData();
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取统计数据出错:', error);
    return getMockData();
  }
}

/**
 * @function getMockData
 * @description 提供模拟数据，用于API请求失败时的降级处理
 * @returns {Object} 模拟的统计数据
 */
function getMockData() {
  return {
    channelCount: 5,
    videoCount: 42,
    syncStatus: '开发模式',
    nextSyncTime: new Date(Date.now() + 3600000).toISOString(),
  };
}

/**
 * @component Home
 * @description 主页面组件，展示系统概览和主要功能入口
 * @returns {JSX.Element} 渲染的主页面
 */
export default async function Home() {
  // 获取仪表板统计数据
  const stats = await fetchDashboardStats();
  
  return (
    <div className="page-container">
      <div className="content-container">
        <h1 className="page-title"> </h1>
        
        <div className="content-container-sm">
          <h1 className="home-title"> </h1>
          
          {/* 系统概览卡片 */}
          <div className="feature-card mb-8">
            <div className="card-header-themed">
              <h2 className="section-title">
                <span className="title-indicator"></span>
                系统概览
              </h2>
            </div>
            <div className="card-body">
              {/* 统计数据网格 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                {/* 订阅频道统计 */}
                <div className="stat-card p-4 rounded-lg border border-[rgba(var(--accent-color),0.2)] bg-[rgba(var(--accent-color),0.05)]">
                  <div className="text-sm text-[rgba(var(--foreground-rgb),0.7)]">订阅频道</div>
                  <div className="text-2xl font-bold text-[rgb(var(--accent-color))]">{stats.channelCount}</div>
                </div>
                {/* 同步视频统计 */}
                <div className="stat-card p-4 rounded-lg border border-[rgba(var(--accent-color),0.2)] bg-[rgba(var(--accent-color),0.05)]">
                  <div className="text-sm text-[rgba(var(--foreground-rgb),0.7)]">同步视频</div>
                  <div className="text-2xl font-bold text-[rgb(var(--accent-color))]">{stats.videoCount}</div>
                </div>
                {/* 同步状态显示 */}
                <div className="stat-card p-4 rounded-lg border border-[rgba(var(--accent-color),0.2)] bg-[rgba(var(--accent-color),0.05)]">
                  <div className="text-sm text-[rgba(var(--foreground-rgb),0.7)]">同步状态</div>
                  <div className="text-2xl font-bold text-[rgb(var(--accent-color))]">{stats.syncStatus}</div>
                </div>
                {/* 下次同步倒计时 */}
                <div className="stat-card p-4 rounded-lg border border-[rgba(var(--accent-color),0.2)] bg-[rgba(var(--accent-color),0.05)]">
                  <div className="text-sm text-[rgba(var(--foreground-rgb),0.7)]">下次同步</div>
                  <SyncCountdown nextSyncTime={stats.nextSyncTime} />
                </div>
              </div>
            </div>
          </div>
          
          {/* 功能导航区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* 内容管理卡片 */}
            <div className="feature-card">
              <div className="card-header-themed">
                <h2 className="section-title">
                  <span className="title-indicator"></span>
                  内容管理
                </h2>
              </div>
              <div className="card-body">
                <ul className="space-y-4 mt-2">
                  {/* 订阅管理入口 */}
                  <li className="nav-item">
                    <Link href="/subscriptions" className="main-nav-link text-lg flex items-center">
                      <span className="icon-container">📺</span>
                      订阅管理
                    </Link>
                    <p className="description-text">
                      添加和管理YouTube频道和播放列表订阅
                    </p>
                  </li>
                  {/* 视频列表入口 */}
                  <li className="nav-item">
                    <Link href="/videos" className="main-nav-link text-lg flex items-center">
                      <span className="icon-container">🎬</span>
                      视频列表
                    </Link>
                    <p className="description-text">
                      查看已同步的视频并创建翻译任务
                    </p>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="card-header-themed">
                <h2 className="section-title">
                  <span className="title-indicator"></span>
                  系统管理
                </h2>
              </div>
              <div className="card-body">
                <ul className="space-y-4 mt-2">
                  <li className="nav-item">
                    <Link href="/settings" className="main-nav-link text-lg flex items-center">
                      <span className="icon-container">⚙️</span>
                      系统设置
                    </Link>
                    <p className="description-text">
                      配置API密钥和系统参数
                    </p>
                  </li>
                  <li className="nav-item">
                    <Link href="/logs" className="main-nav-link text-lg flex items-center">
                      <span className="icon-container">📝</span>
                      系统日志
                    </Link>
                    <p className="description-text">
                      查看系统运行日志和错误信息
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mb-8 card card-body">
            <div className="guide-header"></div>
            <h2 className="text-xl font-bold mb-4 gradient-text">开始使用</h2>
            <ol className="instruction-list space-y-3">
              <li className="flex items-start">
                <span className="step-number">1</span>
                <div>
                  <strong className="step-title">设置API密钥</strong> - 在系统设置中配置YouTube和Heygen API密钥
                </div>
              </li>
              <li className="flex items-start">
                <span className="step-number">2</span>
                <div>
                  <strong className="step-title">添加订阅</strong> - 添加您想要翻译的YouTube频道或播放列表
                </div>
              </li>
              <li className="flex items-start">
                <span className="step-number">3</span>
                <div>
                  <strong className="step-title">同步内容</strong> - 系统将自动同步视频或手动触发同步
                </div>
              </li>
              <li className="flex items-start">
                <span className="step-number">4</span>
                <div>
                  <strong className="step-title">创建翻译任务</strong> - 为视频创建AI翻译任务
                </div>
              </li>
            </ol>
          </div>
          
          <div className="version-info mt-8 text-center border-t border-[rgba(var(--accent-color),0.1)] pt-4">

          </div>
        </div>
      </div>
    </div>
  );
}