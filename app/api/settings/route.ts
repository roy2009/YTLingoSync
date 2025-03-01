import { NextRequest, NextResponse } from 'next/server';
import { getEnvSetting, getAllEnvSettings, updateEnvSettings } from '@/lib/env-service';
import { logger } from '@/lib/logger';

/**
 * 添加CORS头部到响应
 */
function addCorsHeaders(response: NextResponse, request?: NextRequest): NextResponse {
  // 默认只允许同源请求
  const origin = request?.headers.get('origin') || '';
  const host = request?.headers.get('host') || '';
  const hostDomain = host.split(':')[0];
  
  // 只有当origin与host匹配时，允许该origin
  if (origin && new URL(origin).hostname === hostDomain) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // 对于没有origin的请求（如内部请求），允许所有访问
    // 但对于有origin的外部请求，这将不允许跨域访问
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  
  return response;
}

/**
 * 处理OPTIONS预检请求
 */
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 200 });
  return addCorsHeaders(response, request);
}

/**
 * 验证请求是否来自授权的客户端
 */
function isAuthorizedRequest(request: NextRequest): boolean {
  // 获取请求头信息
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  // 1. 允许无Referer和Origin的请求 (可能是内部请求)
  if (!referer && !origin) {
    return true;
  }
  
  // 2. 检查是否是同源请求
  const hostDomain = host?.split(':')[0] || '';
  const refererHostname = referer ? new URL(referer).hostname : null;
  const originHostname = origin ? new URL(origin).hostname : null;
  
  // 如果是同源请求，允许访问
  if ((refererHostname && refererHostname === hostDomain) || 
      (originHostname && originHostname === hostDomain)) {
    return true;
  }
  
  // 3. 对于跨域请求，检查API密钥
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return true;
  }
  
  // 所有验证都失败，拒绝请求
  return false;
}

/**
 * 设置项接口
 */
interface SettingItem {
  id: string;
  value: string;
}

/**
 * GET /api/settings
 * 获取设置项
 * 支持查询参数 keys 指定要获取的设置键（逗号分隔）
 */
export async function GET(request: NextRequest) {
  // 安全检查
  if (!isAuthorizedRequest(request)) {
    logger.warn('未授权的设置访问尝试', { 
      ua: request.headers.get('user-agent') || 'unknown'
    });
    let response = NextResponse.json({ error: '未授权访问' }, { status: 401 });
    return addCorsHeaders(response, request);
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const keysParam = searchParams.get('keys');
    
    // 获取所有环境变量设置
    const allSettings = await getAllEnvSettings();
    
    // 如果指定了keys参数，只返回指定的设置
    if (keysParam) {
      const keys = keysParam.split(',');
      const filteredSettings = keys.map(key => ({
        id: key,
        value: (allSettings as Record<string, string>)[key] || getEnvSetting(key) || ''
      }));
      
      let response = NextResponse.json({ settings: filteredSettings });
      return addCorsHeaders(response, request);
    }
    
    // 否则返回所有设置
    const allSettingsArray = Object.entries(allSettings).map(([key, value]) => ({
      id: key,
      value: value || ''
    }));
    
    let response = NextResponse.json({ settings: allSettingsArray });
    return addCorsHeaders(response, request);
  } catch (error) {
    logger.error('获取设置失败', { error });
    let response = NextResponse.json(
      { error: '获取设置失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}

/**
 * POST /api/settings
 * 保存设置项
 * 请求体格式: { settings: [{ id: string, value: string }] }
 */
export async function POST(request: NextRequest) {
  // 安全检查
  if (!isAuthorizedRequest(request)) {
    logger.warn('未授权的设置修改尝试', { 
      ua: request.headers.get('user-agent') || 'unknown'
    });
    let response = NextResponse.json({ error: '未授权访问' }, { status: 401 });
    return addCorsHeaders(response, request);
  }
  
  try {
    const body = await request.json();
    
    if (!body.settings || !Array.isArray(body.settings)) {
      let response = NextResponse.json(
        { error: '无效的请求格式' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }
    
    // 转换为环境变量格式
    const settingsToUpdate: Record<string, string> = {};
    body.settings.forEach((item: SettingItem) => {
      if (item.id && item.value !== undefined) {
        settingsToUpdate[item.id] = item.value;
      }
    });
    
    // 更新环境变量
    const success = await updateEnvSettings(settingsToUpdate);
    
    if (!success) {
      let response = NextResponse.json(
        { error: '保存设置失败' },
        { status: 500 }
      );
      return addCorsHeaders(response, request);
    }
    
    logger.info('设置已更新', { 
      count: Object.keys(settingsToUpdate).length,
      keys: Object.keys(settingsToUpdate)
    });
    
    let response = NextResponse.json({ success: true });
    return addCorsHeaders(response, request);
  } catch (error) {
    logger.error('保存设置失败', { error });
    let response = NextResponse.json(
      { error: '保存设置失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
} 