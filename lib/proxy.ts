import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import url from 'url';
import https from 'https';

interface ProxyOptions {
  proxyEnabled: boolean;
  proxyUrl: string | undefined;
  proxyUsername?: string;
  proxyPassword?: string;
  verifySSL?: boolean;
}

// 设置代理
export function setupProxy(options: ProxyOptions) {
  const { proxyEnabled, proxyUrl, proxyUsername, proxyPassword, verifySSL = true } = options;
  
  // 创建基础axios配置
  const axiosConfig: any = {
    headers: {
      'User-Agent': 'YoutubeTranslator/1.0'
    },
    timeout: 30000 // 30秒超时
  };
  
  // 日志代理配置，不包含敏感信息
  console.info('代理配置:', {
    enabled: proxyEnabled,
    url: proxyUrl ? proxyUrl.replace(/\/\/.*@/, '//***:***@') : undefined,
    verifySSL
  });
  
  if (verifySSL === false) {
    console.warn('SSL验证已禁用，这可能存在安全风险');
    axiosConfig.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }
  
  if (!proxyEnabled || !proxyUrl) {
    return axios.create(axiosConfig);
  }
  
  let agent;
  const proxyOptions: any = {};
  
  // 如果有认证信息，添加到代理选项中
  if (proxyUsername && proxyPassword) {
    proxyOptions.auth = `${proxyUsername}:${proxyPassword}`;
  }
  
  // 根据协议创建不同的代理代理
  if (proxyUrl.startsWith('socks://') || proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
    agent = new SocksProxyAgent({
      ...proxyOptions,
      proxy: proxyUrl,
      rejectUnauthorized: verifySSL
    });
  } else {
    // 解析代理URL以确定是HTTP还是HTTPS
    const parsedUrl = url.parse(proxyUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    
    const agentOptions = {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : (isHttps ? 443 : 80),
      ...proxyOptions,
      rejectUnauthorized: verifySSL
    };
    
    if (isHttps) {
      agent = new HttpsProxyAgent(agentOptions);
    } else {
      agent = new HttpProxyAgent(agentOptions);
    }
  }
  
  // 创建带有代理的axios实例
  return axios.create({
    ...axiosConfig,
    httpAgent: agent,
    httpsAgent: agent,
    proxy: false // 关闭axios的默认代理设置，因为我们使用自定义代理代理
  });
}

// 获取当前活跃的代理设置
export async function getActiveProxyConfig() {
  try {
    // 从环境变量中获取代理设置
    const { getEnvSetting } = await import('./env-service');
    
    return {
      proxyEnabled: getEnvSetting('PROXY_ENABLED') === 'true',
      proxyUrl: getEnvSetting('PROXY_URL') || '',
      proxyUsername: getEnvSetting('PROXY_USERNAME') || '',
      proxyPassword: getEnvSetting('PROXY_PASSWORD') || '',
      verifySSL: getEnvSetting('VERIFY_SSL') !== 'false'
    };
  } catch (error) {
    console.error('获取代理设置失败:', error);
    return {
      proxyEnabled: false,
      proxyUrl: '',
      proxyUsername: '',
      proxyPassword: '',
      verifySSL: true
    };
  }
}

// 创建一个应用代理设置的axios实例
export async function createProxiedAxios() {
  const proxyConfig = await getActiveProxyConfig();
  return setupProxy(proxyConfig);
}