import puppeteer from 'puppeteer';
import { prisma } from './prisma';
import { logger } from './logger';
import { getAllEnvSettings } from './env-service';

// 环境变量和配置
const HEYGEN_BASE_URL = 'https://app.heygen.com';

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
  
  console.log(`开始查找文本为"${text}"的元素`)
  
  try {
    // 等待页面稳定
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    // 在页面中查找匹配的元素
    const targetElement = await page.evaluate((searchText) => {
      const elements = Array.from(document.querySelectorAll('*'))
      const element = elements.find(el => {
        const elementText = el.textContent?.trim()
        return elementText === searchText && el.offsetParent !== null
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
      
      console.log(`成功点击文本为"${text}"的元素`)
      return {
        success: true,
        element: targetElement
      }
    } else {
      console.log(`未找到可见的文本为"${text}"的元素`)
      return {
        success: false,
        element: null
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? (error.stack || '无堆栈信息') : '非标准错误对象';
    console.log(`点击文本为"${text}"的元素时出错: ${errorMessage}\n错误堆栈: ${errorStack}`);
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
export async function loginToHeygen(): Promise<{browser: any, page: any}> {
  logger.info('开始登录 HeyGen 平台');
  
  // 获取HeyGen邮箱和密码
  logger.info('获取设置');
  const config = await getAllEnvSettings();
  logger.info('获取设置 OK');

  if (!config.HEYGEN_LOGIN_EMAIL || !config.HEYGEN_LOGIN_PASSWORD) {
    logger.info('HeyGen 登录信息未配置，请检查 HEYGEN_LOGIN_EMAIL 和 HEYGEN_LOGIN_PASSWORD 设置');
    throw new Error('HeyGen 登录信息未配置，请检查 HEYGEN_LOGIN_EMAIL 和 HEYGEN_LOGIN_PASSWORD 设置');
  }
  
  logger.info('启动浏览器 - 从无头模式改为显示模式');
  // 启动浏览器 - 从无头模式改为显示模式
  const browser = await puppeteer.launch({
    headless: true, // 关闭无头模式以便于调试
    defaultViewport: null, // 使用默认视口大小
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized' // 最大化浏览器窗口
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // 添加开发者工具选项
    const session = await page.target().createCDPSession();
    await session.send('Runtime.enable');
    
    // 启用控制台输出到终端
    page.on('console', msg => console.log('浏览器页面控制台:', msg.text()));

    // 导航到登录页面并等待网络请求完成
    await page.goto(`${HEYGEN_BASE_URL}/login`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    })

    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: 30000 }
    )
    // 额外等待1秒
    await page.evaluate(() => new Promise(r => setTimeout(r, 1000)))

    await page.keyboard.press('Tab')
    await page.keyboard.type(config.HEYGEN_LOGIN_EMAIL || '')
    await page.keyboard.press('Tab')
    await page.keyboard.type(config.HEYGEN_LOGIN_PASSWORD || '')

    // 提交登录表单并等待导航完成
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ 
        waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
        timeout: 60000
      })
    ])

    // 等待一段时间确保页面完全加载
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)))

    // 获取当前页面URL并验证登录状态
    const currentUrl = page.url()
      
    // 验证登录是否成功
    if (currentUrl.includes('app.heygen.com') && !currentUrl.includes('/login')) {
      logger.info('HeyGen 登录成功');
      return { browser, page };
    } else {
      throw new Error('登录验证失败')
    }      

  } catch (error) {
    // 登录失败时关闭浏览器并抛出错误
    await browser.close();
    logger.error('HeyGen 登录失败:', error);
    throw new Error('登录 HeyGen 失败: ' + error.message);
  }
}

/**
 * 关闭浏览器实例
 */
export async function closeBrowser(browser: any) {
  if (browser) {
    try {
      await browser.close();
      logger.info('浏览器实例已关闭');
    } catch (error) {
      logger.error('关闭浏览器实例失败:', error);
    }
  }
}
/**
 * 提交视频到 HeyGen 进行翻译，不再获取任务ID
 * @param videoId 数据库中的视频 ID (字符串)
 * @returns 是否成功提交
 */
export async function submitToHeygen(videoId: string): Promise<boolean> {
  let browser = null;
  let video = null;
  
  try {
    console.log('开始提交视频到 HeyGen', videoId)
    // 获取视频信息
    video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      logger.error(`Video not found: ${videoId}`);
      return false;
    }

    const youtubeId = video.youtubeId
    // 更新视频状态为处理中
    await prisma.video.update({
      where: { id: video.id },
      data: {
        translationStatus: 'processing'
      }
    });

    // 实现 Heygen 翻译逻辑
    let success = false;
    // 登录 HeyGen
    const session = await loginToHeygen();

    if (session) {
      browser = session.browser;
      const page = session.page;

      // 1. 导航到视频翻译页面
      console.log('开始导航到视频翻译页面')
      await page.goto('https://app.heygen.com/projects?create_video_modal=true&modal_screen=translate_url', {
        waitUntil: 'networkidle0',
        timeout: 60000
      })
      console.log('成功导航到视频翻译页面')

      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )
      console.log('视频翻译页面加载完成')
      console.log('定位到URL输入框')
      
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.type(`https://www.youtube.com/watch?v=${youtubeId}`)

      console.log('翻译视频URL输入完成')

      // 点击第一页的Create new translation按钮
      page.keyboard.press('Enter')

      console.log('等待5秒...')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)))
      console.log('等待完成')

      // 点击第二页的Create new translation按钮
      console.log('等待第二页Create new translation按钮出现')
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )
      console.log('页面已稳定')
      await findAndClickElementByText(page, 'Create new translation')
      console.log('等待1秒...')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      console.log('等待完成')
      
      // 查找并点击元素
      const result = await findAndClickElementByText(page, 'Choose a language...', 'Chinese')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      if (result.success && result.element) {
        console.log(`元素位置: (${result.element.x}, ${result.element.y})`)
        await page.mouse.click(result.element.x+20, result.element.y+result.element.height+result.element.height/2)
        console.log('已点击元素')
      }
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      await findAndClickElementByText(page, 'Include captionsCreator')
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)))
      await findAndClickElementByText(page, 'Submit for Translation')

      console.log('等待提交完成...')
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 30000 }
      )

      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 10000)))
      console.log('等待完成')

      // 关闭浏览器并返回成功响应
      await closeBrowser(browser);
      browser = null; // 避免在 finally 中再次关闭
      console.log('浏览器已关闭')
      success = true
    }

    if (success) {
      // 更新视频状态为完成
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
    logger.error('Heygen translation failed:', error);
    return false;
  } finally {
    // 确保浏览器实例被关闭
    if (browser) {
      await closeBrowser(browser);
    }
  }
}

