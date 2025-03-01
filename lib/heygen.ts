import * as puppeteer from 'puppeteer';
import { prisma } from './prisma';
import { logger } from './logger';
import { getAllEnvSettings } from './env-service';

// 环境变量和配置
const HEYGEN_BASE_URL = 'https://app.heygen.com';

// 全局变量，用于保存浏览器和页面实例
let globalBrowser: puppeteer.Browser | null = null;
let globalPage: puppeteer.Page | null = null;
let isLoggedIn: boolean = false;
let lastLoginTime: number = 0;
const LOGIN_EXPIRY_TIME = 1000 * 60 * 60 * 2; // 2小时后重新登录

// 任务队列相关变量
interface HeygenTask {
  videoId: string;
  resolve: (result: boolean) => void;
  reject: (error: Error) => void;
  addTime: number; // 添加到队列的时间
}

let processingTask = false; // 是否有任务正在处理
const taskQueue: HeygenTask[] = []; // 任务队列
const MAX_QUEUE_WAIT_TIME = 1000 * 60 * 30; // 最大等待时间（30分钟）
const QUEUE_CHECK_INTERVAL = 1000 * 60 * 5; // 队列检查间隔（5分钟）

// 启动队列监控
setInterval(checkQueueTimeout, QUEUE_CHECK_INTERVAL);

/**
 * 检查队列中是否有超时的任务
 */
function checkQueueTimeout() {
  const now = Date.now();
  const timeoutTasks: HeygenTask[] = [];
  
  // 找出所有超时的任务
  for (let i = taskQueue.length - 1; i >= 0; i--) {
    const task = taskQueue[i];
    if (now - task.addTime > MAX_QUEUE_WAIT_TIME) {
      timeoutTasks.push(task);
      taskQueue.splice(i, 1);
    }
  }
  
  // 处理超时任务
  for (const task of timeoutTasks) {
    logger.warn(`任务超时: ${task.videoId}，已从队列中移除（等待时间超过${MAX_QUEUE_WAIT_TIME / 1000 / 60}分钟）`);
    
    // 更新视频状态为失败
    prisma.video.update({
      where: { id: task.videoId },
      data: {
        translationStatus: 'failed',
        translationError: '任务等待超时'
      }
    }).catch(err => {
      logger.error(`更新超时任务状态失败: ${err}`);
    });
    
    // 拒绝Promise
    task.reject(new Error('任务等待超时'));
  }
  
  if (timeoutTasks.length > 0) {
    logger.info(`从队列中移除了 ${timeoutTasks.length} 个超时任务，当前队列长度: ${taskQueue.length}`);
  }
}

/**
 * 获取当前翻译队列状态
 * @returns 队列状态信息
 */
export function getHeygenQueueStatus() {
  return {
    queueLength: taskQueue.length,
    isProcessing: processingTask,
    queuedTasks: taskQueue.map(task => ({
      videoId: task.videoId,
      waitingTime: Math.floor((Date.now() - task.addTime) / 1000) // 等待时间（秒）
    })),
    browserInfo: {
      isActive: globalBrowser !== null,
      isLoggedIn: isLoggedIn,
      lastLoginTime: lastLoginTime > 0 ? new Date(lastLoginTime).toISOString() : null
    }
  };
}

/**
 * 在页面中查找并点击包含指定文本的元素
 * 
 * 主要功能：
 * 1. 在页面中搜索包含指定文本的可见元素
 * 2. 计算元素的中心点坐标
 * 3. 模拟鼠标点击该元素
 * 4. 如果指定了typeAfterClick参数，在点击后输入文本
 * 
 * @param {puppeteer.Page} page - Puppeteer页面实例
 * @param {string} text - 要查找的元素文本，必须完全匹配
 * @param {string} typeAfterClick - 点击后要输入的文本（可选）
 * @returns {Promise<{success: boolean, element: any}>} 操作结果，包含成功状态和元素信息
 */
async function findAndClickElementByText(page: puppeteer.Page, text: string, typeAfterClick?: string) {
  
  logger.debug(`开始查找文本为"${text}"的元素`)
  
  try {
    // 等待页面稳定
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    // 在页面中查找匹配的元素
    const targetElement = await page.evaluate((searchText: string) => {
      const elements = Array.from(document.querySelectorAll('*'))
      const element = elements.find(el => {
        const elementText = el.textContent?.trim()
        return elementText === searchText && (el as HTMLElement).offsetParent !== null
      })
      
      if (element) {
        // 获取元素的位置和尺寸信息
        const rect = element.getBoundingClientRect()
        return {
          x: rect.x + rect.width / 2,  // 计算元素中心点X坐标
          y: rect.y + rect.height / 2,  // 计算元素中心点Y坐标
          width: rect.width,
          height: rect.height,
          found: true,
          isVisible: window.getComputedStyle(element).display !== 'none',
          text: element.textContent?.trim(),
          tag: element.tagName.toLowerCase(),
          className: element.className
        }
      }
      return { found: false }
    }, text)
  
    // 如果找到可见的目标元素
    if (targetElement.found && targetElement.isVisible) {
      // 点击元素
      await page.mouse.click(targetElement.x, targetElement.y)
      
      // 如果需要在点击后输入文本
      if (typeAfterClick) {
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)))
        await page.keyboard.type(typeAfterClick)
      }
      
      logger.debug(`成功点击文本为"${text}"的元素`)
      return {
        success: true,
        element: targetElement
      }
    } else {
      logger.debug(`未找到可见的文本为"${text}"的元素`)
      return {
        success: false,
        element: null
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? (error.stack || '无堆栈信息') : '非标准错误对象';
    logger.debug(`点击文本为"${text}"的元素时出错: ${errorMessage}\n错误堆栈: ${errorStack}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 登录到 HeyGen 平台
 * @returns 登录后的浏览器和页面实例
 */
export async function loginToHeygen(): Promise<{browser: puppeteer.Browser, page: puppeteer.Page}> {
  // 检查是否已有全局浏览器实例，并且是否在有效期内
  const currentTime = Date.now();
  if (globalBrowser && globalPage && isLoggedIn && (currentTime - lastLoginTime < LOGIN_EXPIRY_TIME)) {
    try {
      // 检查页面是否仍然可用
      await globalPage.evaluate(() => document.title);
      logger.debug('使用现有的 HeyGen 会话');
      return { browser: globalBrowser, page: globalPage };
    } catch (e) {
      // 页面不可用，需要重新创建浏览器
      logger.debug('现有页面不可用，需要重新登录');
      if (globalBrowser) {
        try {
          await globalBrowser.close();
        } catch (closeError) {
          const closeErrorMessage = closeError instanceof Error ? closeError.message : String(closeError);
          logger.debug('关闭不可用的浏览器实例失败:', closeErrorMessage);
        }
      }
      globalBrowser = null;
      globalPage = null;
      isLoggedIn = false;
    }
  }

  logger.debug('开始登录 HeyGen 平台');
  
  // 获取HeyGen邮箱和密码
  logger.debug('获取设置');
  const config = await getAllEnvSettings();
  logger.debug('获取设置 OK');

  if (!config.HEYGEN_LOGIN_EMAIL || !config.HEYGEN_LOGIN_PASSWORD) {
    logger.debug('HeyGen 登录信息未配置，请检查 HEYGEN_LOGIN_EMAIL 和 HEYGEN_LOGIN_PASSWORD 设置');
    throw new Error('HeyGen 登录信息未配置，请检查 HEYGEN_LOGIN_EMAIL 和 HEYGEN_LOGIN_PASSWORD 设置');
  }
  
  logger.debug('启动浏览器');
  
  try {
    // 如果没有全局浏览器实例，创建一个新的
    if (!globalBrowser) {
      globalBrowser = await puppeteer.launch({
        headless: true, // 无头模式
        defaultViewport: null, // 使用默认视口大小
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--start-maximized' // 最大化浏览器窗口
        ]
      });
    }
    
    // 创建新页面
    globalPage = await globalBrowser.newPage();
    
    // 添加开发者工具选项
    const session = await globalPage.target().createCDPSession();
    await session.send('Runtime.enable');
    
    // 启用控制台输出到终端
    globalPage.on('console', (msg: puppeteer.ConsoleMessage) => logger.debug('浏览器页面控制台:', msg.text()));

    // 导航到登录页面并等待网络请求完成
    await globalPage.goto(`${HEYGEN_BASE_URL}/login`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    })

    await globalPage.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 30000 }
    )
    // 额外等待1秒
    await globalPage.evaluate(() => new Promise(r => setTimeout(r, 1000)))

    await globalPage.keyboard.press('Tab')
    await globalPage.keyboard.type(config.HEYGEN_LOGIN_EMAIL || '')
    await globalPage.keyboard.press('Tab')
    await globalPage.keyboard.type(config.HEYGEN_LOGIN_PASSWORD || '')

    // 提交登录表单并等待导航完成
    await Promise.all([
      globalPage.keyboard.press('Enter'),
      globalPage.waitForNavigation({ 
        waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
        timeout: 60000
      })
    ])

    // 等待一段时间确保页面完全加载
    await globalPage.evaluate(() => new Promise(r => setTimeout(r, 2000)))

    // 获取当前页面URL并验证登录状态
    const currentUrl = globalPage.url()
      
    // 验证登录是否成功
    if (currentUrl.includes('app.heygen.com') && !currentUrl.includes('/login')) {
      logger.debug('HeyGen 登录成功');
      isLoggedIn = true;
      lastLoginTime = Date.now();
      return { browser: globalBrowser, page: globalPage };
    } else {
      throw new Error('登录验证失败')
    }      

  } catch (error) {
    // 登录失败时关闭浏览器并抛出错误
    if (globalBrowser) {
      try {
        await globalBrowser.close();
      } catch (closeError) {
        const closeErrorMessage = closeError instanceof Error ? closeError.message : String(closeError);
        logger.debug('关闭浏览器实例失败:', closeErrorMessage);
      }
      globalBrowser = null;
      globalPage = null;
      isLoggedIn = false;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('HeyGen 登录失败:', errorMessage);
    throw new Error('登录 HeyGen 失败: ' + errorMessage);
  }
}

/**
 * 关闭浏览器实例
 */
export async function closeBrowser(browser: puppeteer.Browser | null) {
  // 仅在提供的浏览器实例与全局实例不同时关闭
  if (browser && browser !== globalBrowser) {
    try {
      await browser.close();
      logger.debug('非全局浏览器实例已关闭');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('关闭浏览器实例失败:', errorMessage);
    }
  }
}

/**
 * 强制关闭全局浏览器实例
 */
export async function forceCloseGlobalBrowser() {
  if (globalBrowser) {
    try {
      await globalBrowser.close();
      logger.debug('全局浏览器实例已强制关闭');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('强制关闭全局浏览器实例失败:', errorMessage);
    }
    globalBrowser = null;
    globalPage = null;
    isLoggedIn = false;
  }
}

/**
 * 处理队列中的下一个任务
 */
async function processNextTask() {
  if (processingTask || taskQueue.length === 0) {
    return;
  }

  processingTask = true;
  const task = taskQueue.shift();

  if (!task) {
    processingTask = false;
    return;
  }

  logger.debug(`开始处理队列中的任务，队列剩余任务数: ${taskQueue.length}`);

  try {
    const result = await processHeygenTask(task.videoId);
    task.resolve(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`处理队列任务失败: ${errorMessage}`);
    task.reject(new Error(errorMessage));
  } finally {
    processingTask = false;
    // 延迟一小段时间再处理下一个任务，避免可能的资源竞争
    setTimeout(() => {
      processNextTask();
    }, 1000);
  }
}

/**
 * 提交视频到 HeyGen 进行翻译的实际处理函数
 * @param videoId 数据库中的视频 ID (字符串)
 * @returns 是否成功提交
 */
async function processHeygenTask(videoId: string): Promise<boolean> {
  let localBrowser: puppeteer.Browser | null = null;
  let video = null;
  let useGlobalBrowser = true;
  
  try {
    logger.debug('开始处理视频翻译任务', videoId);
    // 获取视频信息
    video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      logger.error(`Video not found: ${videoId}`);
      return false;
    }

    const youtubeId = video.youtubeId;
    // 更新视频状态为处理中
    await prisma.video.update({
      where: { id: video.id },
      data: {
        translationStatus: 'processing'
      }
    });

    // 实现 Heygen 翻译逻辑
    let success = false;
    
    try {
      // 尝试使用全局浏览器实例登录
      const session = await loginToHeygen();
      localBrowser = session.browser;
      const page = session.page;

      // 1. 导航到视频翻译页面
      logger.debug('开始导航到视频翻译页面')
      await page.goto('https://app.heygen.com/projects?create_video_modal=true&modal_screen=translate_url', {
        waitUntil: 'networkidle0',
        timeout: 60000
      })
      logger.debug('成功导航到视频翻译页面')

      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )
      logger.debug('视频翻译页面加载完成')
      logger.debug('定位到URL输入框')
      
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.type(`https://www.youtube.com/watch?v=${youtubeId}`)

      logger.debug('翻译视频URL输入完成')

      // 点击第一页的Create new translation按钮
      page.keyboard.press('Enter')

      logger.debug('等待5秒...')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)))
      logger.debug('等待完成')

      // 点击第二页的Create new translation按钮
      logger.debug('等待第二页Create new translation按钮出现')
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )
      logger.debug('页面已稳定')
      await findAndClickElementByText(page, 'Create new translation')
      logger.debug('等待1秒...')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      logger.debug('等待完成')
      
      // 查找并点击元素
      const result = await findAndClickElementByText(page, 'Choose a language...', 'Chinese')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      if (result.success && result.element) {
        logger.debug(`元素位置: (${result.element.x}, ${result.element.y})`)
        await page.mouse.click(result.element.x+20, result.element.y+result.element.height+result.element.height/2)
        logger.debug('已点击元素')
      }
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      await findAndClickElementByText(page, 'Include captionsCreator')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      await findAndClickElementByText(page, 'Submit for Translation')

      logger.debug('等待提交完成...')
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 10000)))
      logger.debug('等待完成')

      // 操作成功
      success = true
    } catch (submitError) {
      // 提交失败
      const errorMessage = submitError instanceof Error ? submitError.message : String(submitError);
      logger.error('提交到HeyGen失败:', errorMessage);
      
      // 如果是全局浏览器实例出错，则强制重置
      if (useGlobalBrowser) {
        logger.debug('由于提交失败，正在重置全局浏览器实例');
        await forceCloseGlobalBrowser();
      }
      
      success = false;
    }

    if (success) {
      // 更新视频状态为处理中
      await prisma.video.update({
        where: { id: video.id },
        data: {
          translationStatus: 'processing',
          translatedVideoUrl: `` // 示例URL
        }
      });
      return true;
    } else {
      // 更新视频状态为失败
      await prisma.video.update({
        where: { id: video.id },
        data: {
          translationStatus: 'failed',
          translationError: '翻译处理失败'
        }
      });
      return false;
    }

  } catch (error) {
    // 更新视频状态为失败
    if (video) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          translationStatus: 'failed',
          translationError: error instanceof Error ? error.message : '未知错误'
        }
      });
    }
    
    // 如果发生严重错误，重置全局浏览器
    await forceCloseGlobalBrowser();
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Heygen translation failed:', errorMessage);
    return false;
  }
}

/**
 * 提交视频到 HeyGen 进行翻译，不再获取任务ID
 * 如果有任务正在进行，则将新任务添加到队列中等待处理
 * @param videoId 数据库中的视频 ID (字符串)
 * @returns 是否成功提交
 */
export async function submitToHeygen(videoId: string): Promise<boolean> {
  logger.debug(`收到提交视频到HeyGen的请求: ${videoId}，当前任务队列长度: ${taskQueue.length}`);
  
  // 如果当前没有正在处理的任务并且队列为空，直接处理
  if (!processingTask && taskQueue.length === 0) {
    processingTask = true;
    try {
      logger.debug(`直接处理视频翻译任务: ${videoId}`);
      const result = await processHeygenTask(videoId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`处理视频翻译任务直接失败: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      processingTask = false;
      // 检查队列中是否有其他任务
      setTimeout(() => {
        processNextTask();
      }, 1000);
    }
  } else {
    // 有任务正在处理或队列不为空，将新任务添加到队列
    logger.debug(`将视频翻译任务添加到队列: ${videoId}，当前队列长度: ${taskQueue.length}`);
    
    return new Promise((resolve, reject) => {
      taskQueue.push({
        videoId,
        resolve,
        reject,
        addTime: Date.now() // 记录添加到队列的时间
      });
      
      // 如果没有任务正在处理，启动队列处理
      if (!processingTask) {
        processNextTask();
      }
    });
  }
}

