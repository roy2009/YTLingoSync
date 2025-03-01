import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 检查是否是API设置路由
  if (request.nextUrl.pathname.startsWith('/api/settings')) {
    // 获取请求头
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // 允许无Referer的请求，可能是从同一应用发出的
    if (!referer && !origin) {
      return NextResponse.next();
    }
    
    // 解析主机名
    const hostDomain = host?.split(':')[0];
    
    // 允许来自同一域名的请求
    const refererHostname = referer ? new URL(referer).hostname : null;
    const originHostname = origin ? new URL(origin).hostname : null;
    
    // 如果是跨域请求并且来源域名与主机不匹配，拒绝请求
    if ((refererHostname && refererHostname !== hostDomain) || 
        (originHostname && originHostname !== hostDomain)) {
      return new NextResponse(
        JSON.stringify({ error: '拒绝访问：跨域请求不被允许' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }
  
  return NextResponse.next();
}

// 配置中间件适用的路径
export const config = {
  matcher: [
    '/api/settings/:path*',
  ],
} 