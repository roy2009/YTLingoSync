// 设置分类
export const SETTING_CATEGORIES = {
  GENERAL: 'general',
  TRANSLATION: 'translation',
  HEYGEN: 'heygen',
  PROXY: 'proxy',
  SYSTEM: 'system'
};

// 设置分类映射
export const SETTING_CATEGORY_MAP = {
  // 通用设置
  'APP_NAME': SETTING_CATEGORIES.GENERAL,
  'DEFAULT_LANGUAGE': SETTING_CATEGORIES.GENERAL,
  'YOUTUBE_API_KEY': SETTING_CATEGORIES.GENERAL,
  
  // 翻译设置
  'TRANSLATION_SERVICE': SETTING_CATEGORIES.TRANSLATION,
  'TRANSLATION_API_KEY': SETTING_CATEGORIES.TRANSLATION,
  
  // HeyGen设置
  'heygen_login_email': SETTING_CATEGORIES.HEYGEN,
  'heygen_login_password': SETTING_CATEGORIES.HEYGEN,
  'heygen_check_interval': SETTING_CATEGORIES.HEYGEN,
  'heygen_email_host': SETTING_CATEGORIES.HEYGEN,
  'heygen_email_port': SETTING_CATEGORIES.HEYGEN,
  'heygen_email_user': SETTING_CATEGORIES.HEYGEN,
  'heygen_email_password': SETTING_CATEGORIES.HEYGEN,
  'heygen_email_tls': SETTING_CATEGORIES.HEYGEN,
  
  // 代理设置
  'PROXY_ENABLED': SETTING_CATEGORIES.PROXY,
  'PROXY_URL': SETTING_CATEGORIES.PROXY,
  'PROXY_USERNAME': SETTING_CATEGORIES.PROXY,
  'PROXY_PASSWORD': SETTING_CATEGORIES.PROXY,
  'VERIFY_SSL': SETTING_CATEGORIES.PROXY,
  
  // 系统设置
  'LOG_LEVEL': SETTING_CATEGORIES.SYSTEM,
  'MAINTENANCE_MODE': SETTING_CATEGORIES.SYSTEM
};

// 获取特定分类的设置键
export function getSettingKeysByCategory(category: string): string[] {
  return Object.entries(SETTING_CATEGORY_MAP)
    .filter(([_, cat]) => cat === category)
    .map(([key, _]) => key);
}

// 设置布局信息
export const CATEGORY_LAYOUTS = {
  general: {
    title: '通用设置',
    description: '全局系统设置和基本配置'
  },
  heygen: {
    title: 'HeyGen 集成',
    description: 'HeyGen API设置、邮件通知和检查配置',
  },
  translation: {
    title: '翻译服务配置',
    description: '配置翻译API和翻译服务选项'
  },
  proxy: {
    title: '网络代理',
    description: '用于访问受限制网络的代理设置'
  },
  system: {
    title: '系统维护',
    description: '系统日志、性能和维护选项'
  }
}; 