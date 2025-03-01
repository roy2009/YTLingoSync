'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

// 格式化日期函数
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 格式化时长函数
function formatDuration(seconds: number | null) {
  if (!seconds) return '未知';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 视频播放器组件
 * 包含视频切换按钮，位于视频右上角
 */
interface VideoPlayerProps {
  videoId: string;
  isTranslated?: boolean;
  translatedUrl: string | null | undefined;
  hasTranslation?: boolean;
  showTranslated?: boolean;
  setShowTranslated: React.Dispatch<React.SetStateAction<boolean>>;
}

function VideoPlayer({ 
  videoId, 
  isTranslated = false, 
  translatedUrl = null, 
  hasTranslation = false, 
  showTranslated = true, 
  setShowTranslated 
}: VideoPlayerProps) {
  // 创建一个包含视频和切换按钮的容器
  return (
    <div className="aspect-video w-full relative">
      {/* 视频播放器 */}
      <iframe
        src={isTranslated && translatedUrl ? translatedUrl : `https://www.youtube.com/embed/${videoId}`}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
      
      {/* 视频切换按钮 - 放置在视频右上角 */}
      {hasTranslation && (
        <div className="absolute top-4 right-4 z-30">
          <div className="inline-flex rounded-md shadow-sm bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all" role="group">
            <button
              type="button"
              onClick={() => setShowTranslated(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg border ${showTranslated 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-transparent text-gray-200 hover:bg-gray-700/50 border-gray-600'}`}
            >
              翻译视频
            </button>
            <button
              type="button"
              onClick={() => setShowTranslated(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg border ${!showTranslated 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-transparent text-gray-200 hover:bg-gray-700/50 border-gray-600'}`}
            >
              原始视频
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 导入Video类型
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
    type: string;
  };
  channelId: string | null;
  channelTitle: string | null;
  createdAt: string;
  updatedAt: string;
  channelThumbnailUrl?: string;
}

export default function VideoPage() {
  const params = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(true); // 默认显示翻译视频
  
  // 获取视频数据
  useEffect(() => {
    async function fetchVideo() {
      try {
        if (!params.id) return;
        
        const response = await fetch(`/api/videos/${params.id}`);
        
        if (!response.ok) {
          throw new Error('获取视频失败');
        }
        
        const data = await response.json();
        setVideo(data);
      } catch (error) {
        console.error('获取视频详情失败:', error);
        setError(error instanceof Error ? error.message : '获取视频详情失败');
      } finally {
        setLoading(false);
      }
    }
    
    fetchVideo();
  }, [params.id]);
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <p>加载中...</p>
      </div>
    );
  }
  
  // 如果发生错误或没有视频数据，显示错误信息
  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="alert alert-error">
          {error || '未找到视频'}
        </div>
      </div>
    );
  }
  
  // 判断是否有翻译视频可用
  const hasTranslation = video.translationStatus === 'completed' && video.translatedVideoUrl !== null && video.translatedVideoUrl !== ''
  // 如果没有翻译视频，强制显示原始视频
  const currentShowTranslated = hasTranslation ? showTranslated : false;
  
  // 添加调试信息
  console.log('视频翻译状态:', {
    translationStatus: video.translationStatus,
    translatedVideoUrl: video.translatedVideoUrl,
    hasTranslation,
    currentShowTranslated
  });
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 视频播放器部分 */}
      <div className="mb-6">
        <VideoPlayer 
          videoId={video.youtubeId} 
          isTranslated={currentShowTranslated} 
          translatedUrl={video.translatedVideoUrl}
          hasTranslation={hasTranslation}
          showTranslated={showTranslated}
          setShowTranslated={setShowTranslated}
        />
      </div>
      
      {/* 视频标题部分 */}
      <div className="mb-6">
        <div className="flex flex-col gap-2">
          {/* 显示中文标题（如果有）和原标题 */}
          <h1 className="text-2xl font-bold text-white">
            {video.titleZh && video.titleZh !== video.title ? (
              <>
                {video.titleZh}
                <div className="text-base font-medium text-gray-400 mt-1">
                  原标题: {video.title}
                </div>
              </>
            ) : (
              video.title
            )}
          </h1>
        </div>
        
        <div className="flex items-center mt-3 text-gray-400">
          <p>
            {video.channelTitle && (
              <span className="font-medium mr-2">{video.channelTitle}</span>
            )}
            <span>{formatDate(video.publishedAt)}</span>
            {video.duration && (
              <span className="ml-2">{formatDuration(video.duration)}</span>
            )}
          </p>
        </div>
      </div>
      {/* 描述区域 */}
      <div className="mt-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold mr-4">描述</h2>
          {currentShowTranslated ? (
            <div className="flex flex-col space-y-2">
              {video.descriptionZh && (
                <div className="prose prose-sm max-w-none">
                  {video.descriptionZh.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-2">{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {video.description && video.description.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-2">{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}