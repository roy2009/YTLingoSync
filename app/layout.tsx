import { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import MainNav from '@/components/MainNav';
import { BackgroundProvider } from '@/components/BackgroundSwitcher';
import BackgroundSwitcher from '@/components/BackgroundSwitcher';
import AppInitializer from '@/app/components/AppInitializer';
import { initApplication } from '@/app/api/init';

export const metadata: Metadata = {
  title: 'YTLingoSync',
  description: '自动翻译并处理YouTube视频内容',
};

// 在应用启动时初始化
if (typeof window === 'undefined') {
  initApplication().catch(console.error);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="h-full">
      <body suppressHydrationWarning={true} className="min-h-screen flex flex-col">
        <AppInitializer />
        <BackgroundProvider>
          <div className="flex flex-col min-h-screen w-full relative z-10">
          <header className="site-header">
            <div className="header-container">
              <Link href="/" className="site-logo">
              YTLingoSync
              </Link>
              <div className="nav-container">
                <MainNav />
                <div className="tools-container">
                  <BackgroundSwitcher />
                </div>
              </div>
            </div>
          </header>
          <main className="main-content flex-1">
            <p>&nbsp;  </p>
            {children}
          </main>
          <footer className="site-footer mt-auto text-center">
            <div className="inline-flex items-center justify-center w-full">
              <span className="inline-flex items-center gap-4 text-[rgb(var(--accent-color))] hover:text-[rgb(var(--accent-gradient-to))] transition-colors">
              YTLingoSync v1.0 - A software developed by AI under the guidance of humans      
                <a href="https://github.com/roy2009/YTLingoSync" className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>                
                <Link href="/about">About</Link>
              </span>
            </div>
          </footer>
        </div>
        </BackgroundProvider>
      </body>
    </html>
  );
}