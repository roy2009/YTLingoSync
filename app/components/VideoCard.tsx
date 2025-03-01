import React from 'react';

interface VideoCardProps {
  video: {
    id: string;
    duration: number | null;
  };
  translatingId: string | null;
  handleTranslate: (e: React.MouseEvent, id: string) => void;
}

export default function VideoCard({ video, translatingId, handleTranslate }: VideoCardProps) {
  return (
    <div>
      {/* 仅为时长少于30分钟的视频显示翻译按钮 */}
      {video.duration && video.duration < 1800 ? (
        <button
          onClick={(e) => handleTranslate(e, video.id)}
          disabled={translatingId === video.id}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          {translatingId === video.id ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              翻译视频
            </>
          )}
        </button>
      ) : (
        <span className="text-gray-500 text-xs italic">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          视频超过30分钟，暂不支持翻译
        </span>
      )}
    </div>
  );
} 