/**
 * ContentExtractor — 页面内容摘要提取器
 * 提取页面的主要内容区域和导航结构
 */

import type { ContentBlock, NavItem, PageContext } from '../../shared/types';
import { extractInteractiveElements } from './ElementExtractor';
import { extractFormSchemas } from './FormExtractor';

/**
 * 提取完整的页面上下文
 */
export function extractPageContext(): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    description: extractPageDescription(),
    interactiveElements: extractInteractiveElements(),
    forms: extractFormSchemas(),
    contentBlocks: extractContentBlocks(),
    navigation: extractNavigation(),
  };
}

/**
 * 提取页面描述（meta description 或正文前200字）
 */
function extractPageDescription(): string {
  // 优先使用 meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute('content');
    if (content) return content;
  }

  // 其次使用 og:description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    const content = ogDesc.getAttribute('content');
    if (content) return content;
  }

  // 最后取正文前200字
  const main = document.querySelector('main, article, [role="main"]');
  if (main) {
    const text = main.textContent?.trim() || '';
    return text.slice(0, 200);
  }

  return '';
}

/**
 * 提取页面内容块
 */
function extractContentBlocks(): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const selectors = ['main', 'article', 'section', 'aside', '[role="main"]', '[role="article"]'];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim() || '';
      blocks.push({
        role: el.tagName.toLowerCase() === 'main' ? 'main'
          : el.tagName.toLowerCase() === 'article' ? 'article'
          : el.tagName.toLowerCase() === 'aside' ? 'aside'
          : 'section',
        textSummary: text.slice(0, 200),
        childCount: el.children.length,
      });
    });
  });

  return blocks;
}

/**
 * 提取页面导航结构
 */
function extractNavigation(): NavItem[] {
  const items: NavItem[] = [];
  const seen = new Set<string>();

  document.querySelectorAll('nav a, header a, [role="navigation"] a').forEach((el) => {
    const anchor = el as HTMLAnchorElement;
    const text = anchor.innerText?.trim();
    const href = anchor.href;

    if (text && href && !seen.has(href)) {
      seen.add(href);
      items.push({ text, href });
    }
  });

  return items.slice(0, 20); // 最多20个导航项
}
