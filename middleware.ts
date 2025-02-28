import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge Runtime不支持Node.js的http模块，因此不能在中间件中使用initializeApp
// 应用初始化已移至API路由(/api/init)中处理

export async function middleware(request: NextRequest) {
  // 继续处理请求
  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  // 匹配所有路径
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};