import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// 加载.env文件 - 仅在服务器端执行
if (typeof window === 'undefined') {
  config();
}

// 环境变量文件路径
const envFilePath = path.resolve(process.cwd(), '.env');

// 读取所有环境变量
export async function getAllEnvSettings() {
  try {
    // 确保只在服务器端执行
    if (typeof window !== 'undefined') {
      return {};
    }
    
    const envContent = await fs.readFile(envFilePath, 'utf-8');
    const settings: Record<string, string> = {};
    
    // 解析.env文件内容
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          // 移除引号
          settings[key.trim()] = value.replace(/["']/g, '');
        }
      }
    });
    
    return settings;
  } catch (error) {
    console.error('读取环境变量失败:', error);
    return {};
  }
}

// 更新环境变量
export async function updateEnvSettings(newSettings: Record<string, string>) {
  try {
    // 确保只在服务器端执行
    if (typeof window !== 'undefined') {
      return false;
    }
    
    // 读取当前.env文件
    const currentContent = await fs.readFile(envFilePath, 'utf-8');
    const lines = currentContent.split('\n');
    const updatedLines = [];
    const processedKeys = new Set();
    
    // 更新现有的环境变量
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key] = trimmedLine.split('=');
        const trimmedKey = key.trim();
        
        if (trimmedKey in newSettings) {
          updatedLines.push(`${trimmedKey}=${newSettings[trimmedKey]}`);
          processedKeys.add(trimmedKey);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }
    
    // 添加新的环境变量
    for (const [key, value] of Object.entries(newSettings)) {
      if (!processedKeys.has(key)) {
        updatedLines.push(`${key}=${value}`);
      }
    }
    
    // 写入更新后的内容
    await fs.writeFile(envFilePath, updatedLines.join('\n'));
    
    // 重新加载环境变量
    if (typeof window === 'undefined') {
      config();
    }
    
    return true;
  } catch (error) {
    console.error('更新环境变量失败:', error);
    return false;
  }
}

// 获取特定环境变量
export function getEnvSetting(key: string): string | undefined {
  // 确保在服务器端才直接访问process.env
  if (typeof window === 'undefined') {
    return process.env[key];
  }
  return undefined;
}