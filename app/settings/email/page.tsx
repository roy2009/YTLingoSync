'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailSettingsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到HeyGen设置页面
    router.push('/settings/heygen');
  }, [router]);
  
  return (
    <div className="p-6 text-center">
      <p>邮件设置已整合到HeyGen集成设置中，正在跳转...</p>
    </div>
  );
} 