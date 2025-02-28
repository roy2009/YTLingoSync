'use client';

/**
 * @fileoverview 视频列表页面组件
 * 该页面负责展示所有视频内容，支持按订阅和时间范围筛选
 * 提供视频播放、翻译和删除等功能
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video as PrismaVideo } from '@prisma/client';

/**
 * 视频数据接口定义
 * @interface Video
 */
interface Video {
  id: string;
  youtubeId: string;
  title: string;
  titleZh: string | null;
  description: string | null;
  descriptionZh: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  duration: number | null;
  processed: boolean;
  translationStatus: string | null; // "pending", "processing", "completed", "failed"
  translationError: string | null;
  translatedVideoUrl: string | null;
  subscriptionId: string;
  subscription: {
    type: string;  // 添加subscription.type
  };
  channelId: string | null;
  channelTitle: string | null;
  createdAt: string;
  updatedAt: string;
  channelThumbnailUrl?: string;  // 添加这个字段用于UI显示
}

/**
 * 频道数据接口定义
 * @interface Channel
 */
interface Channel {
  id: string;
  thumbnailUrl: string;
}


/**
 * 搜索参数包装组件
 * 用于处理和传递URL搜索参数
 * @param {Object} props - 组件属性
 * @param {Function} props.children - 接收搜索参数的子组件函数
 */
function SearchParamsWrapper({ children }: { children: (searchParams: URLSearchParams) => React.ReactNode }) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

/**
 * 根据状态颜色返回对应的CSS类名
 * 用于视频翻译状态的样式展示
 * @param {string} color - 状态颜色标识
 * @returns {string} 对应的CSS类名
 */
function getStatusColor(color: string): string {
  switch (color) {
    case 'gray':
      return 'bg-gray-600 text-gray-100';
    case 'yellow':
      return 'bg-yellow-500 text-yellow-900';
    case 'blue':
      return 'bg-blue-500 text-blue-50';
    case 'green':
      return 'bg-green-500 text-green-50';
    case 'red':
      return 'bg-red-500 text-red-50';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}

/**
 * 视频列表内容组件
 * 负责视频列表的核心功能实现，包括：
 * - 视频数据的获取和展示
 * - 视频的筛选（按订阅和时间范围）
 * - 视频的播放控制
 * - 视频的翻译处理
 * - 视频的删除操作
 * - 状态管理和UI交互
 */
function VideosContent() {
  /**
   * 路由和参数相关的hooks
   */
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * 视频数据和加载状态管理
   * @state {Video[]} videos - 视频列表数据
   * @state {boolean} loading - 页面加载状态
   * @state {string|null} error - 错误信息
   * @state {string|null} success - 成功提示信息
   */
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * 筛选条件状态管理
   * @state {string|null} currentSubscription - 当前选中的订阅ID
   * @state {string|null} currentTimeRange - 当前选中的时间范围
   * @state {string|null} currentTranslationStatus - 当前选中的翻译状态
   * @state {Array<{id: string, name: string}>} subscriptions - 所有可用的订阅列表
   * @state {string} searchQuery - 搜索关键词
   */
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [currentTimeRange, setCurrentTimeRange] = useState<string | null>(null);
  const [currentTranslationStatus, setCurrentTranslationStatus] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<{id: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * 视频操作状态管理
   * @state {string|null} translatingId - 当前正在翻译的视频ID
   * @state {string|null} playingVideoId - 当前正在播放的视频ID
   * @state {string|null} deletingId - 当前正在删除的视频ID
   * @state {string|null} videoToDelete - 待删除的视频ID
   * @state {boolean} showConfirmDelete - 是否显示删除确认对话框
   */
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  /**
   * UI交互状态管理
   * @state {Object} message - 全局消息提示状态
   * @state {boolean} isClient - 客户端渲染标记
   * @state {string} youtubeUrl - YouTube视频URL输入
   * @state {boolean} addingVideo - 视频添加状态
   * @state {string|null} hoveredTitle - 当前鼠标悬停的标题ID
   * @state {string|null} hoveredOriginal - 当前鼠标悬停的原标题ID
   * @state {Object} hoveredPosition - 鼠标悬停位置坐标
   */
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isClient, setIsClient] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [hoveredOriginal, setHoveredOriginal] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 同步URL参数到状态
  useEffect(() => {
    const subId = searchParams.get('subscriptionId');
    const time = searchParams.get('timeRange');
    const query = searchParams.get('q');
    const status = searchParams.get('translationStatus');
    setCurrentSubscription(subId);
    setCurrentTimeRange(time);
    setSearchQuery(query || '');
    setCurrentTranslationStatus(status);
  }, [searchParams]);

  // 获取所有订阅
  useEffect(() => {
    async function fetchSubscriptions() {
      try {
  
        const response = await fetch('/api/subscriptions');
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data.map((sub: any) => ({ id: sub.id, name: sub.name })));
        }
      } catch (error) {
        console.error('获取订阅失败:', error);
      }
    }

    fetchSubscriptions();
  }, []);

  // 获取视频
  useEffect(() => {
    async function fetchVideos() {

      
      setLoading(true);
      setError(null);
      
      try {
        let url = '/api/videos?';
        const params = new URLSearchParams();
        
        if (currentSubscription) {
          params.append('subscriptionId', currentSubscription);
        }
        
        if (currentTimeRange) {
          params.append('timeRange', currentTimeRange);
        }
        
        if (currentTranslationStatus) {
          params.append('translationStatus', currentTranslationStatus);
        }
        
        const apiUrl = params.toString() ? `/api/videos?${params.toString()}` : '/api/videos';
        
        const response = await fetch(apiUrl);
        

        
        let errorData;
        
        try {
          const data = await response.json();

          
          if (!response.ok) {
            errorData = data;
            throw new Error(data.error || '获取视频失败');
          }

          // 从响应中提取 videos 数组
          const videoArray = Array.isArray(data.videos) ? data.videos : [];

          
          // 修改日期处理逻辑
          const processedData = videoArray.map((video: Video) => {
            // 确保日期字段是字符串格式
            const publishedAt = video.publishedAt ? new Date(video.publishedAt).toISOString() : null;
            const createdAt = video.createdAt ? new Date(video.createdAt).toISOString() : null;
            const updatedAt = video.updatedAt ? new Date(video.updatedAt).toISOString() : null;

            return {
              ...video,
              publishedAt: publishedAt || video.publishedAt,
              createdAt: createdAt || video.createdAt,
              updatedAt: updatedAt || video.updatedAt,
              titleZh: video.titleZh || null,
              description: video.description || null,
              descriptionZh: video.descriptionZh || null,
              thumbnailUrl: video.thumbnailUrl || null,
              duration: video.duration || null,
              translationStatus: video.translationStatus || null,
              translationError: video.translationError || null,
              translatedVideoUrl: video.translatedVideoUrl || null,
              channelId: video.channelId || null,
              channelTitle: video.channelTitle || null,
              subscription: video.subscription || { type: '' }
            };
          });
          

          setVideos(processedData);
          
          // 如果有搜索关键词，在前端进行筛选
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const filtered = processedData.filter(video => {
              const titleMatch = (video.title?.toLowerCase().includes(query) || false) || 
                               (video.titleZh?.toLowerCase().includes(query) || false);
              const descMatch = (video.description?.toLowerCase().includes(query) || false) || 
                              (video.descriptionZh?.toLowerCase().includes(query) || false);
              return titleMatch || descMatch;
            });
            setVideos(filtered);
          }
          
          // 获取频道信息
          if (processedData.length > 0) {
            const channelIds = Array.from(new Set(
              processedData.map((video: Video) => video.channelId).filter(Boolean)
            ));
            

            
            if (channelIds.length > 0) {
              try {
                const channelsUrl = `/api/channels?ids=${channelIds.join(',')}`;
                const channelsResponse = await fetch(channelsUrl);
                
                if (!channelsResponse.ok) {
                  throw new Error('获取频道信息失败');
                }
                
                const channelsData = await channelsResponse.json();

                
                setVideos(prev => prev.map((video: Video) => {
                  if (video.channelId) {
                    const channelInfo = channelsData.find((channel: Channel) => 
                      channel.id === video.channelId
                    );
                    return {
                      ...video,
                      channelThumbnailUrl: channelInfo?.thumbnailUrl || null
                    };
                  }
                  return video;
                }));
                
              } catch (error) {
                console.error('获取频道信息失败:', error);
              }
            }
          }
          
        } catch (parseError) {
          console.error('JSON解析错误:', parseError);
          
          throw new Error(
            errorData?.error || 
            (response.ok ? '解析响应数据失败' : `服务器错误 (${response.status})`)
          );
        }
        
      } catch (error) {
        console.error('获取视频列表失败:', error);
        setError(error instanceof Error ? error.message : '获取视频列表失败');
        setVideos([]);
      } finally {
        setLoading(false);

      }
    }

    fetchVideos();
  }, [currentSubscription, currentTimeRange, currentTranslationStatus, searchQuery]);

  // 确保channelIds被正确提取和格式化
  const channelIds = Array.from(new Set(videos.map(video => video.channelId).filter((id): id is string => Boolean(id))));
  
  // 处理订阅筛选变化
  const handleSubscriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "" ? null : e.target.value;
    setCurrentSubscription(value);
    updateFiltersInUrl({ subscriptionId: value });
  };
  
  // 处理时间范围筛选变化
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "" ? null : e.target.value;
    setCurrentTimeRange(value);
    updateFiltersInUrl({ timeRange: value });
  };
  
  // 处理翻译状态筛选变化
  const handleTranslationStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "" ? null : e.target.value;
    setCurrentTranslationStatus(value);
    updateFiltersInUrl({ translationStatus: value });
  };
  
  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // 不再每次输入都更新URL和触发搜索
  };
  
  // 处理搜索提交
  const handleSearchSubmit = () => {
    updateFiltersInUrl({ q: searchQuery });
  };
  
  // 处理搜索框按键事件
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };
  
  // 处理视频翻译
  const handleTranslate = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发视频点击事件
    setTranslatingId(videoId);
    
    try {
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/videos/${videoId}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 更新视频列表中的翻译状态
        setVideos(videos.map(video => 
          video.id === videoId 
            ? { ...video, translationStatus: 'pending' } 
            : video
        ));
        setSuccess('翻译任务创建成功');
      } else {
        setError(data.error || '创建翻译任务失败');
      }
    } catch (error) {
      setError('创建翻译任务时发生错误');
      console.error('翻译请求错误:', error);
    } finally {
      setTranslatingId(null);
    }
  };

  // 更新URL中的筛选参数
  const updateFiltersInUrl = (updates: {
    subscriptionId?: string;
    timeRange?: string;
    q?: string;
    translationStatus?: string;
  }) => {
    const params = new URLSearchParams();
    
    // 保留现有参数
    const currentSubId = updates.subscriptionId !== undefined 
      ? updates.subscriptionId 
      : currentSubscription;
    
    const currentTime = updates.timeRange !== undefined 
      ? updates.timeRange 
      : currentTimeRange;
    
    const currentQuery = updates.q !== undefined
      ? updates.q
      : searchQuery;
      
    const currentStatus = updates.translationStatus !== undefined
      ? updates.translationStatus
      : currentTranslationStatus;
    
    if (currentSubId) params.append('subscriptionId', currentSubId);
    if (currentTime) params.append('timeRange', currentTime);
    if (currentQuery) params.append('q', currentQuery);
    if (currentStatus) params.append('translationStatus', currentStatus);
    
    const queryString = params.toString();
    router.push(queryString ? `/videos?${queryString}` : '/videos');
  };

  // 获取视频状态
  const getVideoStatus = (video: Video) => {
    if (!video.translationStatus) {
      return { label: '未翻译', color: 'gray' };
    }
    
    const statuses: Record<string, { label: string; color: string }> = {
      'pending': { label: '等待中', color: 'yellow' },
      'processing': { label: '翻译中', color: 'blue' },
      'completed': { label: '已翻译', color: 'green' },
      'failed': { label: '失败', color: 'red' }
    };
    
    return statuses[video.translationStatus] || { label: '未知', color: 'gray' };
  };

  // 格式化时长
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '未知';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 添加一个固定格式的日期格式化函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 处理视频点击 - 导航到视频详情页面
  const handleVideoClick = (videoId: string, youtubeId: string) => {
    if (!videoId) return;
    
    // 导航到视频详情页面
    router.push(`/videos/${videoId}`);
  };

  // 处理删除视频
  const handleDeleteVideo = (videoId: string) => {
    setVideoToDelete(videoId);
    setShowConfirmDelete(true);
  };

  // 确认删除视频
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    setDeletingId(videoToDelete);
    setShowConfirmDelete(false);
    
    try {
      const response = await fetch(`/api/videos/${videoToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 从状态中移除已删除的视频
        setVideos(videos.filter(video => video.id !== videoToDelete));
        setSuccess('视频已成功删除');
      } else {
        const data = await response.json();
        setError(data.error || '删除视频失败');
      }
    } catch (error) {
      console.error('删除视频时发生错误:', error);
      setError('删除视频时发生错误');
    } finally {
      setDeletingId(null);
      setVideoToDelete(null);
    }
  };

  // 更新鼠标事件处理函数
  const handleTitleMouseEnter = (videoId: string, e: React.MouseEvent) => {
    setHoveredTitle(videoId);
    setHoveredPosition({ x: e.clientX, y: e.clientY });
  };

  const handleOriginalMouseEnter = (videoId: string, e: React.MouseEvent) => {
    setHoveredOriginal(videoId);
    setHoveredPosition({ x: e.clientX, y: e.clientY });
  };

  if (!isClient) {
    return null;
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-container">
          <h1 className="page-title">视频列表</h1>
          <div className="text-center py-8">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        {/* 页面标题和筛选区域 */}
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="page-title">视频列表</h1>
          
          {/* 筛选条件选择区 */}
          <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0">
            {/* 搜索框和搜索按钮 */}
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索视频..."
                className="form-input rounded-r-none"
              />
              <button
                onClick={handleSearchSubmit}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none"
                title="搜索"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            
            {/* 订阅筛选 */}
            <select
              value={currentSubscription || ''}
              onChange={handleSubscriptionChange}
              className="form-select"
            >
              <option value="">所有订阅</option>
              {subscriptions.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            
            {/* 时间范围筛选 */}
            <select
              value={currentTimeRange || ''}
              onChange={handleTimeRangeChange}
              className="form-select"
            >
              <option value="">所有时间</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="year">今年</option>
            </select>
            
            {/* 翻译状态筛选 */}
            <select
              value={currentTranslationStatus || ''}
              onChange={handleTranslationStatusChange}
              className="form-select"
            >
              <option value="">所有状态</option>
              <option value="pending">等待中</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
              <option value="null">未翻译</option>
            </select>
          </div>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}
        
        {/* 成功提示 */}
        {success && (
          <div className="alert alert-success mb-6">
            {success}
          </div>
        )}
        
        {/* 视频列表 */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => {
              const status = getVideoStatus(video);
              return (
                <div key={video.id} className="video-card">
                  <div className="relative">
                    {/* 视频缩略图 */}
                    <div 
                      className="aspect-video w-full bg-gray-800 rounded-t-lg overflow-hidden cursor-pointer"
                      onClick={() => handleVideoClick(video.id, video.youtubeId)}
                    >
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-gray-500">无缩略图</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 视频时长 */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    
                    {/* 翻译状态标签 */}
                    <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${getStatusColor(status.color)}`}>
                      {status.label}
                    </div>
                  </div>
                  
                  {/* 视频信息 */}
                  <div className="p-4 bg-gray-800/70 backdrop-blur-md rounded-b-lg border-t border-gray-700/30 shadow-inner">
                    <div className="flex items-start gap-3">
                      {/* 频道头像 */}
                      {video.channelThumbnailUrl && (
                        <div className="flex-shrink-0">
                          <img 
                            src={video.channelThumbnailUrl} 
                            alt={video.channelTitle || '频道'} 
                            className="w-8 h-8 rounded-full"
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow min-w-0">
                        {/* 视频标题 */}
                        <h3 
                          className="text-base font-medium text-white truncate cursor-pointer hover:text-blue-400"
                          onClick={() => handleVideoClick(video.id, video.youtubeId)}
                          onMouseEnter={(e) => handleTitleMouseEnter(video.id, e)}
                          onMouseLeave={() => setHoveredTitle(null)}
                        >
                          {video.titleZh || video.title}
                        </h3>
                        
                        {/* 如果有中文标题且与原标题不同，显示原标题 */}
                        {video.titleZh && video.titleZh !== video.title && (
                          <p 
                            className="text-xs text-gray-400 truncate mt-1 cursor-pointer hover:text-gray-300"
                            onMouseEnter={(e) => handleOriginalMouseEnter(video.id, e)}
                            onMouseLeave={() => setHoveredOriginal(null)}
                          >
                            原标题: {video.title}
                          </p>
                        )}
                        
                        {/* 频道名称和发布日期 */}
                        <div className="text-xs text-gray-500 mt-1">
                          {video.channelTitle && (
                            <span className="mr-2">{video.channelTitle}</span>
                          )}
                          <span>{formatDate(video.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex justify-end mt-3 gap-2">

                      
                      {/* 翻译按钮 - 仅为时长少于30分钟的视频显示 */}
                      {video.duration && video.duration < 1800 ? (
                        <button
                          onClick={(e) => handleTranslate(e, video.id)}
                          disabled={translatingId === video.id}
                          className="btn btn-sm btn-info"
                        >
                          {translatingId === video.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              翻译中
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                              </svg>
                              翻译
                            </>
                          )}
                        </button>
                      ) : null}
                      
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        disabled={deletingId === video.id}
                        className="btn btn-sm btn-error"
                      >
                        {deletingId === video.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            删除中
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">没有找到符合条件的视频</p>
          </div>
        )}
      </div>
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-white mb-4">确认删除</h3>
            <p className="text-gray-300 mb-6">
              确定要删除这个视频吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteVideo}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 页面底部添加全局悬浮窗口 */}
      {hoveredTitle && videos.map(video => {
        if (video.id === hoveredTitle) {
          return (
            <div 
              key={`title-hover-${video.id}`}
              className="fixed p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[1000] w-80"
              style={{ 
                top: hoveredPosition.y + 20,
                left: hoveredPosition.x - 40
              }}
              onMouseEnter={() => setHoveredTitle(video.id)}
              onMouseLeave={() => setHoveredTitle(null)}
            >
              <div className="mb-2 pb-2 border-b border-gray-700">
                <h4 className="text-base font-medium text-white">{video.titleZh || video.title}</h4>
              </div>
              <p className="text-sm text-white font-medium mb-2">
              </p>
              <div className="max-h-60 overflow-y-auto pr-2">
                <p className="text-xs text-gray-300 whitespace-pre-line overflow-hidden">
                  {video.descriptionZh || '暂无中文描述'}
                </p>
              </div>
            </div>
          );
        }
        return null;
      })}

      {hoveredOriginal && videos.map(video => {
        if (video.id === hoveredOriginal) {
          return (
            <div 
              key={`original-hover-${video.id}`}
              className="fixed p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[1000] w-80"
              style={{ 
                top: hoveredPosition.y + 20, 
                left: hoveredPosition.x - 40
              }}
              onMouseEnter={() => setHoveredOriginal(video.id)}
              onMouseLeave={() => setHoveredOriginal(null)}
            >
              <div className="mb-2 pb-2 border-b border-gray-700">
                <h4 className="text-base font-medium text-white">{video.title}</h4>
              </div>
              <p className="text-sm text-white font-medium mb-2">
                
              </p>
              <div className="text-xs text-gray-400 mb-2"></div>
              <div className="max-h-60 overflow-y-auto pr-2">
                <p className="text-xs text-gray-300 whitespace-pre-line overflow-hidden">
                  {video.description || '暂无描述'}
                </p>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// 主页面组件
export default function VideosPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">
      <span className="loading loading-spinner loading-lg"></span>
    </div>}>
      <VideosContent />
    </Suspense>
  );
}