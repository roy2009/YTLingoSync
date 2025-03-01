// 订阅相关类型定义
export interface Subscription {
  id: string;
  name: string;
  type: string;
  sourceId: string;
  lastSync: string;
  thumbnailUrl?: string;
  countryCode?: string;
  maxDurationForTranslation?: number | null;
  targetLanguage?: string;
  autoTranslate?: boolean;
  initialFetchCount?: number;
  _count: {
    videos: number;
  };
}

export interface TestVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration: number;
}

export interface TestResult {
  success: boolean;
  name: string;
  logoUrl?: string;
  videos: TestVideo[];
  logs: string[];
}

export interface NewSubscription {
  type: string;
  sourceId: string;
  maxDurationForTranslation: number | null;
  targetLanguage: string;
  autoTranslate: boolean;
  initialFetchCount: number;
}

export interface EditSubscriptionForm {
  name: string;
  maxDurationForTranslation: number | null;
  targetLanguage: string;
  autoTranslate: boolean;
  initialFetchCount: number;
}

export interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
} 