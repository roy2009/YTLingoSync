import { NextRequest, NextResponse } from 'next/server';
import { 
  getQuotaStatus, 
  addApiKey, 
  updateApiKey, 
  deleteApiKey, 
  resetApiKeyStatus 
} from '@/lib/api-key-service';
import { logger } from '@/lib/logger';

// 获取所有API密钥及配额状态
export async function GET() {
  try {
    const status = await getQuotaStatus();
    return NextResponse.json(status);
  } catch (error) {
    logger.error('获取API密钥状态失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '获取API密钥状态失败' },
      { status: 500 }
    );
  }
}

// 添加新的API密钥
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证请求数据
    if (!data.key || !data.name) {
      return NextResponse.json(
        { error: 'API密钥和名称为必填项' },
        { status: 400 }
      );
    }
    
    const newKey = await addApiKey({
      key: data.key,
      name: data.name,
      dailyQuotaLimit: data.dailyQuotaLimit,
      priority: data.priority,
      isActive: data.isActive
    });
    
    return NextResponse.json(newKey);
  } catch (error) {
    logger.error('添加API密钥失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '添加API密钥失败' },
      { status: 500 }
    );
  }
}

// 更新API密钥
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证请求数据
    if (!data.id) {
      return NextResponse.json(
        { error: 'API密钥ID为必填项' },
        { status: 400 }
      );
    }
    
    const updatedKey = await updateApiKey(data.id, {
      name: data.name,
      isActive: data.isActive,
      dailyQuotaLimit: data.dailyQuotaLimit,
      priority: data.priority,
      currentUsage: data.currentUsage
    });
    
    return NextResponse.json(updatedKey);
  } catch (error) {
    logger.error('更新API密钥失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '更新API密钥失败' },
      { status: 500 }
    );
  }
}

// 删除API密钥
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'API密钥ID为必填项' },
        { status: 400 }
      );
    }
    
    await deleteApiKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('删除API密钥失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '删除API密钥失败' },
      { status: 500 }
    );
  }
}

// 重置API密钥状态
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'API密钥ID为必填项' },
        { status: 400 }
      );
    }
    
    if (data.action === 'reset') {
      const result = await resetApiKeyStatus(data.id);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('重置API密钥状态失败', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: '重置API密钥状态失败' },
      { status: 500 }
    );
  }
} 