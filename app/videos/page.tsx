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

  // 添加视频悬停状态
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 同步URL参数到状态 - 优化以确保参数被正确应用
  useEffect(() => {
    console.log('检测到URL参数变化:', {
      subscriptionId: searchParams.get('subscriptionId'),
      timeRange: searchParams.get('timeRange'),
      q: searchParams.get('q'),
      translationStatus: searchParams.get('translationStatus')
    });
    
    const subId = searchParams.get('subscriptionId');
    const time = searchParams.get('timeRange');
    const query = searchParams.get('q') || '';
    const status = searchParams.get('translationStatus');
    
    // 重要：始终设置状态值，即使是空值也要设置
    // 这样可以确保状态与URL参数保持一致
    setCurrentSubscription(subId);
    setCurrentTimeRange(time);
    setSearchQuery(query);
    setCurrentTranslationStatus(status);
    
    // 保存到本地存储 - 只保存非空值
    if (subId) localStorage.setItem('videoFilters_subscription', subId);
    if (time) localStorage.setItem('videoFilters_timeRange', time);
    if (query) localStorage.setItem('videoFilters_searchQuery', query);
    if (status) localStorage.setItem('videoFilters_translationStatus', status);
    
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

  // 获取视频 - 修改为直接使用searchParams而不是依赖状态
  useEffect(() => {
    async function fetchVideos() {
      console.log('获取视频 - 当前筛选条件:', {
        subscription: currentSubscription,
        timeRange: currentTimeRange,
        translationStatus: currentTranslationStatus,
        searchQuery: searchQuery
      });
      
      setLoading(true);
      setError(null);
      
      try {
        // 构建查询参数 - 直接从URL和状态中获取参数
        const params = new URLSearchParams();
        
        // 优先使用URL中的参数，如果没有则使用状态中的值
        const subId = searchParams.get('subscriptionId') || currentSubscription;
        const timeRange = searchParams.get('timeRange') || currentTimeRange;
        const status = searchParams.get('translationStatus') || currentTranslationStatus;
        const queryParam = searchParams.get('q') || searchQuery;
        
        if (subId) {
          console.log('应用订阅ID筛选:', subId);
          params.append('subscriptionId', subId);
        }
        
        if (timeRange) {
          params.append('timeRange', timeRange);
        }
        
        if (status) {
          // 处理特殊的 null 状态值
          if (status === 'null') {
            params.append('translationStatus', 'null');
          } else {
            params.append('translationStatus', status);
          }
        }
        
        const apiUrl = params.toString() ? `/api/videos?${params.toString()}` : '/api/videos';
        console.log('API请求URL:', apiUrl);
        
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
          if (queryParam) {
            const searchTermLower = queryParam.toLowerCase();
            const filtered = processedData.filter((video: Video) => {
              const titleMatch = (video.title?.toLowerCase().includes(searchTermLower) || false) || 
                               (video.titleZh?.toLowerCase().includes(searchTermLower) || false);
              const descMatch = (video.description?.toLowerCase().includes(searchTermLower) || false) || 
                              (video.descriptionZh?.toLowerCase().includes(searchTermLower) || false);
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
  }, [currentSubscription, currentTimeRange, currentTranslationStatus, searchParams]);

  // 确保channelIds被正确提取和格式化
  const channelIds = Array.from(new Set(videos.map(video => video.channelId).filter((id): id is string => Boolean(id))));
  
  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // 不再每次输入都更新URL和触发搜索
  };
  
  // 处理搜索提交
  const handleSearchSubmit = () => {
    // 只有当搜索框非空或者之前有搜索条件时才更新
    if (searchQuery.trim() || searchParams.get('q')) {
      updateFiltersInUrl({ q: searchQuery.trim() || undefined });
      // 保存到本地存储
      if (searchQuery.trim()) {
        localStorage.setItem('videoFilters_searchQuery', searchQuery.trim());
      } else {
        localStorage.removeItem('videoFilters_searchQuery');
      }
    }
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
    
    // 修复逻辑：当传递undefined时，表示要清除该筛选条件
    const currentSubId = updates.subscriptionId !== undefined 
      ? updates.subscriptionId  // 如果更新中明确指定了值（包括空字符串），则使用该值
      : currentSubscription;    // 否则保持当前状态
    
    const currentTime = updates.timeRange !== undefined 
      ? updates.timeRange 
      : currentTimeRange;
    
    const currentQuery = updates.q !== undefined
      ? updates.q
      : searchQuery;
      
    const currentStatus = updates.translationStatus !== undefined
      ? updates.translationStatus
      : currentTranslationStatus;
    
    // 只有在值存在且不为空字符串时才添加到URL参数中
    if (currentSubId) params.append('subscriptionId', currentSubId);
    if (currentTime) params.append('timeRange', currentTime);
    if (currentQuery) params.append('q', currentQuery);
    if (currentStatus) params.append('translationStatus', currentStatus);
    
    const queryString = params.toString();
    router.push(queryString ? `/videos?${queryString}` : '/videos');
    
    // 打印调试信息
    console.log('更新URL筛选参数:', { 
      更新值: updates, 
      计算后的值: { currentSubId, currentTime, currentQuery, currentStatus },
      最终URL: queryString ? `/videos?${queryString}` : '/videos'
    });
  };

  // 获取视频状态
  const getVideoStatus = (video: Video) => {
    if (!video.translationStatus) {
      return { label: '未翻译', color: 'gray' };
    }
    
    const statuses: Record<string, { label: string; color: string }> = {
      'none': { label: '未翻译', color: 'gray' },
      'skipped': { label: '已跳过', color: 'gray' },
      'pending': { label: '等待翻译', color: 'yellow' },
      'processing': { label: '翻译中', color: 'blue' },
      'completed': { label: '翻译完成', color: 'green' },
      'failed': { label: '翻译失败', color: 'red' }
    };
    
    return statuses[video.translationStatus] || { label: '未知状态', color: 'gray' };
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

  // 添加一个useEffect用于从localStorage加载保存的筛选条件
  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      // 检查URL是否包含任何筛选参数
      const hasUrlParams = searchParams.has('subscriptionId') || 
                           searchParams.has('timeRange') || 
                           searchParams.has('q') || 
                           searchParams.has('translationStatus');
      
      // 只有当URL没有任何参数时，才尝试从localStorage加载
      if (!hasUrlParams) {
        try {
          const savedSubscription = localStorage.getItem('videoFilters_subscription');
          const savedTimeRange = localStorage.getItem('videoFilters_timeRange');
          const savedTranslationStatus = localStorage.getItem('videoFilters_translationStatus');
          const savedSearchQuery = localStorage.getItem('videoFilters_searchQuery');
          
          // 如果有任何保存的值，更新URL以反映这些值
          if (savedSubscription || savedTimeRange || savedTranslationStatus || savedSearchQuery) {
            console.log('从本地存储加载筛选条件并更新URL');
            updateFiltersInUrl({
              subscriptionId: savedSubscription || undefined,
              timeRange: savedTimeRange || undefined,
              translationStatus: savedTranslationStatus || undefined,
              q: savedSearchQuery || undefined
            });
          }
        } catch (error) {
          console.error('从本地存储加载筛选条件失败:', error);
        }
      }
    }
    // 这个useEffect只在组件挂载时运行一次
  }, [isClient, searchParams]);

  useEffect(() => {
    setIsClient(true);
    
    // 添加点击外部关闭下拉菜单的事件处理
    const handleClickOutside = (event: MouseEvent) => {
      // 关闭订阅下拉菜单
      const subscriptionDropdown = document.getElementById('subscription-dropdown');
      const subscriptionButton = event.target instanceof Element && event.target.closest('#subscription-dropdown-btn');
      if (subscriptionDropdown && !subscriptionDropdown.contains(event.target as Node) && !subscriptionButton) {
        subscriptionDropdown.classList.add('hidden');
      }
      
      // 关闭时间范围下拉菜单
      const timerangeDropdown = document.getElementById('timerange-dropdown');
      const timerangeButton = event.target instanceof Element && event.target.closest('#timerange-dropdown-btn');
      if (timerangeDropdown && !timerangeDropdown.contains(event.target as Node) && !timerangeButton) {
        timerangeDropdown.classList.add('hidden');
      }
      
      // 关闭翻译状态下拉菜单
      const translationStatusDropdown = document.getElementById('translation-status-dropdown');
      const translationStatusButton = event.target instanceof Element && event.target.closest('#translation-status-dropdown-btn');
      if (translationStatusDropdown && !translationStatusDropdown.contains(event.target as Node) && !translationStatusButton) {
        translationStatusDropdown.classList.add('hidden');
      }
    };

    // 添加事件监听器
    document.addEventListener('click', handleClickOutside);
    
    // 组件卸载时移除事件监听器
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">视频列表</h1>
            
            {/* 搜索框 */}
            <div className="search-container flex max-w-md w-full">
              <div className="relative flex-grow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="搜索视频..."
                  className="w-full py-2 pl-4 pr-12 bg-gray-800 border border-gray-700 text-white rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="搜索视频"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (searchParams.get('q')) {
                        updateFiltersInUrl({ q: undefined });  // 清除URL中的搜索参数
                      }
                      // 清除本地存储
                      localStorage.removeItem('videoFilters_searchQuery');
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label="清除搜索"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearchSubmit}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-r-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="执行搜索"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* 筛选区域 - 更现代化的标签式筛选 */}
          <div className="filters-container mt-4 flex flex-wrap gap-2">
            {/* 订阅筛选 */}
            <div className="filter-group relative">
              <button
                id="subscription-dropdown-btn"
                onClick={() => document.getElementById('subscription-dropdown')?.classList.toggle('hidden')}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-full text-sm focus:outline-none ${currentSubscription ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <span>订阅: {currentSubscription ? (subscriptions.find(s => s.id === currentSubscription)?.name || '已选择') : '全部'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="subscription-dropdown" className="hidden absolute z-10 mt-1 w-48 rounded-md bg-gray-900 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1 max-h-60 overflow-auto">
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ subscriptionId: '' });  // 使用空字符串代替undefined
                      document.getElementById('subscription-dropdown')?.classList.add('hidden');
                      // 清除本地存储
                      localStorage.removeItem('videoFilters_subscription');
                    }}
                    className={`${!currentSubscription ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    全部订阅
                  </button>
                  {subscriptions.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        updateFiltersInUrl({ subscriptionId: sub.id });
                        document.getElementById('subscription-dropdown')?.classList.add('hidden');
                        // 保存到本地存储
                        localStorage.setItem('videoFilters_subscription', sub.id);
                      }}
                      className={`${currentSubscription === sub.id ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 时间范围筛选 */}
            <div className="filter-group relative">
              <button
                id="timerange-dropdown-btn"
                onClick={() => document.getElementById('timerange-dropdown')?.classList.toggle('hidden')}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-full text-sm focus:outline-none ${currentTimeRange ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <span>时间: {currentTimeRange ? 
                  (currentTimeRange === 'today' ? '今天' : 
                   currentTimeRange === 'week' ? '本周' : 
                   currentTimeRange === 'month' ? '本月' : 
                   currentTimeRange === 'year' ? '今年' : currentTimeRange) : '全部'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="timerange-dropdown" className="hidden absolute z-10 mt-1 w-40 rounded-md bg-gray-900 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ timeRange: '' });  // 使用空字符串代替undefined
                      document.getElementById('timerange-dropdown')?.classList.add('hidden');
                      // 清除本地存储
                      localStorage.removeItem('videoFilters_timeRange');
                    }}
                    className={`${!currentTimeRange ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    全部时间
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ timeRange: 'today' });
                      document.getElementById('timerange-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_timeRange', 'today');
                    }}
                    className={`${currentTimeRange === 'today' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    今天
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ timeRange: 'week' });
                      document.getElementById('timerange-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_timeRange', 'week');
                    }}
                    className={`${currentTimeRange === 'week' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    本周
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ timeRange: 'month' });
                      document.getElementById('timerange-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_timeRange', 'month');
                    }}
                    className={`${currentTimeRange === 'month' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    本月
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ timeRange: 'year' });
                      document.getElementById('timerange-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_timeRange', 'year');
                    }}
                    className={`${currentTimeRange === 'year' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    今年
                  </button>
                </div>
              </div>
            </div>
            
            {/* 翻译状态筛选 */}
            <div className="filter-group relative">
              <button
                id="translation-status-dropdown-btn"
                onClick={() => document.getElementById('translation-status-dropdown')?.classList.toggle('hidden')}
                className={`flex items-center gap-1 py-1.5 px-3 rounded-full text-sm focus:outline-none ${currentTranslationStatus ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <span>翻译状态: {currentTranslationStatus ? 
                  (currentTranslationStatus === 'pending' ? '等待翻译' : 
                   currentTranslationStatus === 'processing' ? '翻译处理中' : 
                   currentTranslationStatus === 'completed' ? '翻译完成' : 
                   currentTranslationStatus === 'failed' ? '翻译失败' : 
                   currentTranslationStatus === 'none' ? '未翻译' :
                   currentTranslationStatus === 'null' ? '无状态' : currentTranslationStatus) : '全部'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="translation-status-dropdown" className="hidden absolute z-10 mt-1 w-40 rounded-md bg-gray-900 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: '' });  // 使用空字符串代替undefined
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 清除本地存储
                      localStorage.removeItem('videoFilters_translationStatus');
                    }}
                    className={`${!currentTranslationStatus ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    全部状态
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'pending' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'pending');
                    }}
                    className={`${currentTranslationStatus === 'pending' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    等待翻译
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'processing' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'processing');
                    }}
                    className={`${currentTranslationStatus === 'processing' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    翻译处理中
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'completed' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'completed');
                    }}
                    className={`${currentTranslationStatus === 'completed' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    翻译完成
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'failed' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'failed');
                    }}
                    className={`${currentTranslationStatus === 'failed' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    翻译失败
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'none' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'none');
                    }}
                    className={`${currentTranslationStatus === 'none' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    未翻译
                  </button>
                  <button
                    onClick={() => {
                      updateFiltersInUrl({ translationStatus: 'null' });
                      document.getElementById('translation-status-dropdown')?.classList.add('hidden');
                      // 保存到本地存储
                      localStorage.setItem('videoFilters_translationStatus', 'null');
                    }}
                    className={`${currentTranslationStatus === 'null' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} block px-4 py-2 text-sm w-full text-left`}
                  >
                    无状态
                  </button>
                </div>
              </div>
            </div>
            
            {/* 清除所有筛选 */}
            {(currentSubscription || currentTimeRange || currentTranslationStatus || searchQuery) && (
              <button
                onClick={() => {
                  // 首先清除状态
                  setCurrentSubscription(null);
                  setCurrentTimeRange(null);
                  setCurrentTranslationStatus(null);
                  setSearchQuery('');
                  
                  // 使用空字符串更新URL（因为undefined会被解释为"保持当前值"）
                  updateFiltersInUrl({
                    subscriptionId: '',
                    timeRange: '',
                    translationStatus: '',
                    q: ''
                  });
                  
                  // 清除本地存储
                  localStorage.removeItem('videoFilters_subscription');
                  localStorage.removeItem('videoFilters_timeRange');
                  localStorage.removeItem('videoFilters_searchQuery');
                  localStorage.removeItem('videoFilters_translationStatus');
                  
                  // 强制刷新页面以确保所有筛选条件被清除
                  // router.push('/videos');
                }}
                className="flex items-center gap-1 py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-sm focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>清除筛选</span>
              </button>
            )}
          </div>
        </div>
        
        {/* 错误和成功提示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-md mb-6 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{error}</div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-md mb-6 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>{success}</div>
          </div>
        )}
        
        {/* 视频列表 */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(video => {
              const status = getVideoStatus(video);
              return (
                <div 
                  key={video.id} 
                  className="video-card bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors duration-200 shadow-md flex flex-col"
                  onMouseEnter={() => setHoveredVideoId(video.id)}
                  onMouseLeave={() => setHoveredVideoId(null)}
                >
                  {/* 视频缩略图区域 */}
                  <div 
                    className="video-thumbnail-container relative cursor-pointer"
                    onClick={() => handleVideoClick(video.id, video.youtubeId)}
                  >
                    {/* 视频缩略图 */}
                    <div className="aspect-video w-full bg-gray-800 overflow-hidden">
                      {video.thumbnailUrl ? (
                        <>
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className={`w-full h-full object-cover transition-transform duration-300 ${hoveredVideoId === video.id ? 'scale-110' : 'scale-100'}`}
                          />
                          {/* 播放按钮悬停效果 - YouTube风格 */}
                          <div className={`absolute inset-0 flex items-center justify-center ${hoveredVideoId === video.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 bg-black/30`}>
                            <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </>
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
                  
                  {/* 视频信息区域 */}
                  <div className="p-3 flex-grow flex flex-col">
                    {/* 视频标题和频道区域 */}
                    <div className="flex gap-3 flex-grow">
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
                          className="text-base font-medium text-white line-clamp-2 cursor-pointer hover:text-blue-400"
                          onClick={() => handleVideoClick(video.id, video.youtubeId)}
                          onMouseEnter={(e) => handleTitleMouseEnter(video.id, e)}
                          onMouseLeave={() => setHoveredTitle(null)}
                        >
                          {video.titleZh || video.title}
                        </h3>
                        
                        {/* 频道名称和发布日期 */}
                        <div className="text-xs text-gray-400 mt-1.5">
                          {video.channelTitle && (
                            <div className="truncate hover:text-white">{video.channelTitle}</div>
                          )}
                          <div className="flex items-center mt-1">
                            <span>{formatDate(video.publishedAt)}</span>
                          </div>
                        </div>
                        
                        {/* 如果有中文标题且与原标题不同，显示原标题 */}
                        {video.titleZh && video.titleZh !== video.title && (
                          <p 
                            className="text-xs text-gray-500 mt-1.5 truncate cursor-pointer hover:text-gray-300"
                            onMouseEnter={(e) => handleOriginalMouseEnter(video.id, e)}
                            onMouseLeave={() => setHoveredOriginal(null)}
                          >
                            原标题: {video.title}
                          </p>
                        )}
                        
                        {/* 视频描述 (YouTube风格 - 悬停时显示) */}
                        <div className={`mt-2 text-xs text-gray-400 ${hoveredVideoId === video.id ? 'block' : 'hidden'}`}>
                          <p className="line-clamp-2">{video.descriptionZh || video.description || '暂无描述'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-700/30">
                      {/* 翻译按钮 - 仅为时长少于30分钟的视频显示 */}
                      <div>
                        {video.duration && video.duration < 1800 ? (
                          <button
                            onClick={(e) => handleTranslate(e, video.id)}
                            disabled={translatingId === video.id}
                            className="py-1.5 px-3 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {translatingId === video.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                翻译中
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                翻译
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            超时
                          </span>
                        )}
                      </div>
                      
                      {/* YouTube风格操作按钮 */}
                      <div className="flex items-center gap-1">
                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors duration-200"
                          title="删除视频"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        
                        {/* YouTube风格 - 额外操作按钮 (仅在悬停时显示) */}
                        <div className={`flex gap-1 ${hoveredVideoId === video.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700" 
                            title="稍后观看"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          
                          <button 
                            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700" 
                            title="分享"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">没有找到视频</p>
            <p className="text-sm mt-2">尝试调整筛选条件或搜索其他内容</p>
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