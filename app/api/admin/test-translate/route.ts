import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/translate';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { text = 'Hello world', targetLang = 'zh' } = await request.json();
    
    logger.info(`测试翻译文本: "${text}"`);
    
    const result = await translateText(text, targetLang);
    
    return NextResponse.json({ 
      original: text,
      translated: result,
      success: result !== text
    });
  } catch (error) {
    logger.error('测试翻译失败:', error);
    return NextResponse.json({ 
      error: '翻译测试失败', 
      message: error.message 
    }, { status: 500 });
  }
} 