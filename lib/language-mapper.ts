/**
 * 语言映射工具
 * 将语言名称映射到对应的语言代码，用于翻译API
 */

// 语言名称到语言代码的映射
export const languageNameToCode: Record<string, string> = {
  'Chinese': 'zh-CN',
  'English': 'en',
  'Japanese': 'ja',
  'Korean': 'ko',
  'French': 'fr',
  'German': 'de',
  'Spanish': 'es',
  'Russian': 'ru',
  // 可以根据需要添加更多语言
};

// 语言代码到语言名称的映射
export const languageCodeToName = Object.entries(languageNameToCode).reduce(
  (acc, [name, code]) => {
    acc[code] = name;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * 将语言名称转换为语言代码
 * @param languageName 语言名称，如 'Chinese'
 * @returns 对应的语言代码，如 'zh-CN'，如果未找到则返回原值
 */
export function getLanguageCode(languageName: string): string {
  return languageNameToCode[languageName] || languageName;
}

/**
 * 将语言代码转换为语言名称
 * @param languageCode 语言代码，如 'zh-CN'
 * @returns 对应的语言名称，如 'Chinese'，如果未找到则返回原值
 */
export function getLanguageName(languageCode: string): string {
  return languageCodeToName[languageCode] || languageCode;
}