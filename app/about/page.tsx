import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkEmoji from 'remark-emoji';
import rehypeSlug from 'rehype-slug';
import rehypeAutoLinkHeadings from 'rehype-autolink-headings';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';
import { toString } from 'hast-util-to-string';
import GithubSlugger from 'github-slugger';

// 使用cache确保只读取一次文件
const getReadmeContent = cache(async () => {
  const readmePath = path.join(process.cwd(), 'README.md');
  return await fs.readFile(readmePath, 'utf8');
});

// 提前处理标题，为标题内容创建slug映射
const prepareHeadingsAndSlugs = (markdown: string) => {
  const slugger = new GithubSlugger();
  const headings = Array.from(markdown.matchAll(/^(#{1,3})\s+(.+)$/gm));
  const headingsMap = new Map();
  
  headings.forEach(match => {
    const [_, level, title] = match;
    const slug = slugger.slug(title);
    headingsMap.set(title, slug);
  });
  
  return { headings, headingsMap };
};

// 生成目录的辅助组件
const TableOfContents = ({ headings, headingsMap }: { headings: RegExpMatchArray[], headingsMap: Map<string, string> }) => {
  if (headings.length === 0) {
    return null;
  }
  
  return (
    <div className="toc-container mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-3 pb-2 border-b border-gray-700">目录</h2>
      <ul className="space-y-1 list-inside list-disc">
        {headings.map((match, index) => {
          const [_, hashes, title] = match;
          const level = hashes.length;
          const slug = headingsMap.get(title) || '';
          
          return (
            <li key={index} className={`pl-${(level-1)*4} text-${level === 1 ? 'base' : 'sm'} ${level === 1 ? 'font-medium' : ''}`}>
              <a href={`#${slug}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                {title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// 返回顶部按钮组件
const BackToTop = () => {
  return (
    <div className="fixed bottom-6 right-6">
      <a 
        href="#top" 
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 flex items-center justify-center"
        aria-label="返回顶部"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </a>
    </div>
  );
};

export default async function AboutPage() {
  // 读取README.md文件
  const readmeContent = await getReadmeContent();
  
  // 预处理标题和slug
  const { headings, headingsMap } = prepareHeadingsAndSlugs(readmeContent);
  
  return (
    <div className="container mx-auto px-4 py-8" id="top">
      <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">关于</h1>
      
      <TableOfContents headings={headings} headingsMap={headingsMap} />
      
      <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:border-b prose-headings:pb-2 prose-headings:border-gray-700 prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-800 prose-code:rounded prose-code:px-1 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-hr:border-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-800/50 prose-blockquote:p-4 prose-blockquote:rounded-r-md prose-li:marker:text-blue-500 prose-img:rounded-lg prose-img:shadow-md">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkEmoji]}
          rehypePlugins={[
            rehypeHighlight, 
            rehypeSlug, 
            [rehypeAutoLinkHeadings, { behavior: 'wrap' }]
          ]}
          components={{
            // 自定义h1标签渲染
            h1: ({node, children, ...props}) => {
              // 获取标题文本并使用预先计算的slug
              const text = children ? (Array.isArray(children) ? children.join('') : children.toString()) : '';
              const id = headingsMap.get(text) || '';
              return (
                <h1 id={id} {...props} className="text-2xl font-bold my-4 pb-2 border-b border-gray-700 flex items-center">
                  <span className="mr-2 text-blue-500">#</span>
                  {children}
                </h1>
              );
            },
            // 自定义h2标签渲染
            h2: ({node, children, ...props}) => {
              // 获取标题文本并使用预先计算的slug
              const text = children ? (Array.isArray(children) ? children.join('') : children.toString()) : '';
              const id = headingsMap.get(text) || '';
              return (
                <h2 id={id} {...props} className="text-xl font-bold mt-8 mb-4 pb-2 border-b border-gray-700 flex items-center">
                  <span className="mr-2 text-blue-500">##</span>
                  {children}
                </h2>
              );
            },
            // 自定义h3标签渲染
            h3: ({node, children, ...props}) => {
              // 获取标题文本并使用预先计算的slug
              const text = children ? (Array.isArray(children) ? children.join('') : children.toString()) : '';
              const id = headingsMap.get(text) || '';
              return (
                <h3 id={id} {...props} className="text-lg font-bold mt-6 mb-3 flex items-center">
                  <span className="mr-2 text-blue-500">###</span>
                  {children}
                </h3>
              );
            },
            // 自定义代码块渲染
            code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children: React.ReactNode}) => (
              inline ? 
                <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code> 
              : 
                <code className={className} {...props}>
                  {children}
                </code>
            ),
            // 自定义链接渲染
            a: ({node, href, children, ...props}) => (
              <a 
                href={href} 
                className="text-blue-500 hover:text-blue-400 transition duration-200"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
                {href?.startsWith('http') && <span className="inline-block ml-1">↗</span>}
              </a>
            ),
            // 自定义列表渲染
            ul: ({node, children, ...props}) => (
              <ul className="my-4 space-y-2 list-disc list-inside" {...props}>
                {children}
              </ul>
            ),
          } as Components}
        >
          {readmeContent}
        </ReactMarkdown>
      </div>
      
      <BackToTop />
      
      {/* 添加滚动行为的脚本 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
              anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                  window.scrollTo({
                    top: targetElement.offsetTop - 20,
                    behavior: 'smooth'
                  });
                  
                  // 更新URL而不重新加载页面
                  history.pushState(null, null, '#' + targetId);
                }
              });
            });
          });
        `
      }} />
    </div>
  );
} 