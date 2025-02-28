import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// 使用cache确保只读取一次文件
const getReadmeContent = cache(async () => {
  const readmePath = path.join(process.cwd(), 'README.md');
  return await fs.readFile(readmePath, 'utf8');
});

export default async function AboutPage() {
  // 读取README.md文件
  const readmeContent = await getReadmeContent();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">关于</h1>
      <div className="prose max-w-none dark:prose-invert">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {readmeContent}
        </ReactMarkdown>
      </div>
    </div>
  );
} 