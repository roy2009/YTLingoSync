'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  isValid: boolean;
  priority: number;
  currentUsage: number;
  dailyQuotaLimit: number;
  usagePercentage: number;
  resetTime: string;
  lastUsed: string | null;
  errorMessage: string | null;
  recordCount: number;
}

interface ApiSummary {
  totalKeys: number;
  activeKeys: number;
  totalUsage: number;
  totalLimit: number;
  usagePercentage: number;
}

interface ApiActivity {
  id: string;
  keyName: string;
  keyMasked: string;
  endpoint: string;
  quotaCost: number;
  timestamp: string;
  success: boolean;
  errorInfo: string | null;
}

interface ApiKeyFormData {
  key: string;
  name: string;
  dailyQuotaLimit: number;
  priority: number;
  isActive: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<ApiKeyFormData>({
    key: '',
    name: '',
    dailyQuotaLimit: 10000,
    priority: 0,
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载API密钥数据
  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) {
        throw new Error('获取API密钥失败');
      }
      
      const data = await response.json();
      setKeys(data.keys || []);
      setSummary(data.summary || null);
      setRecentActivity(data.recentActivity || []);
    } catch (error) {
      toast.error('加载API密钥失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadApiKeys();
    
    // 设置刷新定时器
    const intervalId = setInterval(loadApiKeys, 60000); // 每分钟刷新一次
    
    return () => clearInterval(intervalId);
  }, []);

  // 添加新API密钥
  const handleAddApiKey = async () => {
    try {
      setIsSubmitting(true);
      
      // 验证表单
      if (!formData.key || !formData.name) {
        toast.error('请填写必填字段', {
          description: 'API密钥和名称为必填项'
        });
        return;
      }
      
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加API密钥失败');
      }
      
      toast.success('API密钥添加成功');
      setFormOpen(false);
      setFormData({
        key: '',
        name: '',
        dailyQuotaLimit: 10000,
        priority: 0,
        isActive: true
      });
      
      // 重新加载数据
      loadApiKeys();
    } catch (error) {
      toast.error('添加API密钥失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更新API密钥状态
  const toggleApiKeyStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isActive
        }),
      });
      
      if (!response.ok) {
        throw new Error('更新API密钥状态失败');
      }
      
      toast.success(`API密钥已${isActive ? '启用' : '禁用'}`);
      
      // 更新本地状态
      setKeys(keys.map(key => 
        key.id === id ? { ...key, isActive } : key
      ));
    } catch (error) {
      toast.error('更新API密钥状态失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 删除API密钥
  const deleteApiKey = async (id: string) => {
    if (!confirm('确定要删除此API密钥吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/api-keys?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除API密钥失败');
      }
      
      toast.success('API密钥已删除');
      
      // 更新本地状态
      setKeys(keys.filter(key => key.id !== id));
      loadApiKeys(); // 重新加载以更新摘要信息
    } catch (error) {
      toast.error('删除API密钥失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 重置API密钥状态
  const resetApiKey = async (id: string) => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          action: 'reset'
        }),
      });
      
      if (!response.ok) {
        throw new Error('重置API密钥状态失败');
      }
      
      toast.success('API密钥已重置');
      loadApiKeys(); // 重新加载数据
    } catch (error) {
      toast.error('重置API密钥状态失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '未使用';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 渲染API密钥状态标签
  const renderKeyStatus = (key: ApiKey) => {
    if (!key.isActive) {
      return <Badge variant="outline">已禁用</Badge>;
    }
    if (!key.isValid) {
      return <Badge variant="destructive">无效</Badge>;
    }
    if (key.usagePercentage >= 90) {
      return <Badge variant="destructive">快耗尽</Badge>;
    }
    if (key.usagePercentage >= 75) {
      return <Badge variant="warning">高用量</Badge>;
    }
    return <Badge variant="success">正常</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">YouTube API密钥管理</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 添加API密钥
        </Button>
      </div>
      
      {/* 总览卡片 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总API密钥数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalKeys || 0}</div>
            <p className="text-xs text-muted-foreground">
              活跃密钥: {summary?.activeKeys || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总配额使用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalUsage.toLocaleString() || 0}
            </div>
            <Progress value={summary?.usagePercentage || 0} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.usagePercentage || 0}% 已使用
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总配额上限</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalLimit.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              每日重置 (PDT时区)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">刷新数据</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={loadApiKeys}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* API密钥列表 */}
      <Card>
        <CardHeader>
          <CardTitle>API密钥列表</CardTitle>
          <CardDescription>
            管理YouTube Data API密钥及其配额使用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无API密钥，请添加新密钥</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>使用情况</TableHead>
                  <TableHead>最后使用</TableHead>
                  <TableHead>重置时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>{key.key}</TableCell>
                    <TableCell>{key.priority}</TableCell>
                    <TableCell>
                      {renderKeyStatus(key)}
                      {key.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">{key.errorMessage}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Progress value={key.usagePercentage} className="h-2" />
                        <span className="text-xs">
                          {key.currentUsage.toLocaleString()} / {key.dailyQuotaLimit.toLocaleString()} ({key.usagePercentage}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(key.lastUsed)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(key.resetTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Switch 
                          checked={key.isActive}
                          onCheckedChange={(checked) => toggleApiKeyStatus(key.id, checked)}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => resetApiKey(key.id)}
                          title="重置API密钥状态"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => deleteApiKey(key.id)}
                          title="删除API密钥"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* 最近活动 */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>
              显示最近的API密钥使用记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>密钥</TableHead>
                  <TableHead>端点</TableHead>
                  <TableHead>配额成本</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map(activity => (
                  <TableRow key={activity.id}>
                    <TableCell>{activity.keyName} ({activity.keyMasked})</TableCell>
                    <TableCell>{activity.endpoint}</TableCell>
                    <TableCell>{activity.quotaCost}</TableCell>
                    <TableCell>
                      {activity.success ? (
                        <Badge variant="success">成功</Badge>
                      ) : (
                        <Badge variant="destructive">失败</Badge>
                      )}
                      {!activity.success && activity.errorInfo && (
                        <p className="text-xs text-red-500 mt-1">{activity.errorInfo}</p>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(activity.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* 添加API密钥对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新的API密钥</DialogTitle>
            <DialogDescription>
              输入YouTube Data API密钥信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key">API密钥 *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({...formData, key: e.target.value})}
                placeholder="输入您的YouTube API密钥"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="为此密钥提供一个描述性名称"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dailyQuotaLimit">每日配额限制</Label>
              <Input
                id="dailyQuotaLimit"
                type="number"
                value={formData.dailyQuotaLimit}
                onChange={(e) => setFormData({...formData, dailyQuotaLimit: parseInt(e.target.value)})}
                placeholder="默认: 10000"
              />
              <p className="text-xs text-muted-foreground">
                YouTube默认为每个项目每天分配10,000个单位
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="priority">优先级</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                placeholder="默认: 0"
              />
              <p className="text-xs text-muted-foreground">
                数值越小优先级越高，系统会优先使用高优先级密钥
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
              <Label htmlFor="isActive">启用此API密钥</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddApiKey} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 