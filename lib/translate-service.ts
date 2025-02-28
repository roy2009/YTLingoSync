// 根据设置使用不同的翻译API
export async function translateWithSelectedService(text: string, targetLang = 'zh') {
  try {
    // 获取设置
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc, item) => {
      acc[item.id] = item.value;
      return acc;
    }, {});
    
    const service = settingsObj.TRANSLATION_SERVICE || 'none';
    
    if (service === 'none') return text;
    
    if (service === 'google' && settingsObj.GOOGLE_TRANSLATE_API_KEY) {
      // 有API密钥，使用官方API
      return await translateWithGoogleOfficialAPI(text, targetLang, settingsObj.GOOGLE_TRANSLATE_API_KEY);
    } else {
      // 无API密钥或使用其他服务，使用通用翻译函数
      return await translateText(text, targetLang);
    }
  } catch (error) {
    logger.error('翻译服务选择失败:', error);
    return text;
  }
} 