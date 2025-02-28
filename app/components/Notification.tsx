'use client';

import { useEffect, useState } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export default function Notification({ 
  type, 
  message, 
  duration = 3000, 
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };
  
  if (!isVisible) return null;
  
  const bgColor = type === 'success' ? 'bg-green-800' : 
                 type === 'error' ? 'bg-red-800' : 
                 'bg-blue-800';
  
  const iconColor = type === 'success' ? 'text-green-400' : 
                   type === 'error' ? 'text-red-400' : 
                   'text-blue-400';
  
  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
      <div className={`${bgColor} text-gray-200 px-4 py-3 rounded-lg shadow-lg flex items-center max-w-md`}>
        <div className={`${iconColor} mr-3`}>
          {type === 'success' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
          {type === 'error' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          )}
          {type === 'info' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          )}
        </div>
        <div className="flex-1">{message}</div>
        <button 
          onClick={handleClose}
          className="ml-4 text-gray-400 hover:text-white"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
} 