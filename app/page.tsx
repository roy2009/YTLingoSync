/**
 * @file 主页面组件
 * @description 展示系统概览和主要功能入口的仪表板页面
 */

import Link from 'next/link';
import { TaskMonitorCard } from '@/app/components/TaskMonitorCard';

/**
 * @component Home
 * @description 主页面组件，展示系统概览和主要功能入口
 * @returns {JSX.Element} 渲染的主页面
 */
export default async function Home() {
  return (
    <div className="page-container">
      <div className="content-container">
        <h1 className="page-title"> </h1>
        
        <div className="content-container-sm">
          <h1 className="home-title"> </h1>
          
          {/* 定时任务监控卡片 */}
          <div className="mb-8">
            <TaskMonitorCard />
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