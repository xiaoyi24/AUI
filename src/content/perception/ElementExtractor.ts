/**
 * ElementExtractor — 页面可交互元素提取器
 * 遍历 DOM 树，提取所有可交互元素（按钮、链接、输入框等）
 */

import type { InteractiveElement } from '../../shared/types';

/** 需要遍历的可交互标签 */
const INTERACTIVE_TAGS = ['a', 'button', 'input', 'select', 'textarea'];

/** 需要遍历的可交互属性选择器 */
const INTERACTIVE_SELECTORS = ['[role="button"]', '[onclick]', '[tabindex]'];

/**
 * 提取页面中所有可交互元素
 */
export function extractInteractiveElements(): InteractiveElement[] {
  const elements: InteractiveElement[] = [];
  const seen = new Set<string>(); // 去重

  // 1. 遍历标签
  for (const tag of INTERACTIVE_TAGS) {
    document.querySelectorAll(tag).forEach((el) => {
      const elem = buildInteractiveElement(el as HTMLElement);
      if (elem && !seen.has(elem.selector)) {
        seen.add(elem.selector);
        elements.push(elem);
      }
    });
  }

  // 2. 遍历属性选择器
  for (const selector of INTERACTIVE_SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      const elem = buildInteractiveElement(el as HTMLElement);
      if (elem && !seen.has(elem.selector)) {
        seen.add(elem.selector);
        elements.push(elem);
      }
    });
  }

  return elements;
}

/**
 * 从单个 DOM 元素构建 InteractiveElement
 */
function buildInteractiveElement(el: HTMLElement): InteractiveElement | null {
  // 跳过不可见元素
  if (!isElementVisible(el)) return null;

  // 跳过无意义的元素（空链接、隐藏按钮等）
  const text = getElementText(el);
  const ariaLabel = el.getAttribute('aria-label') || '';
  if (!text && !ariaLabel && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
    return null;
  }

  const rect = el.getBoundingClientRect();

  return {
    tag: el.tagName.toLowerCase(),
    type: (el as HTMLInputElement).type || '',
    text: text.slice(0, 100), // 截断过长文本
    ariaLabel,
    placeholder: (el as HTMLInputElement).placeholder || '',
    name: el.getAttribute('name') || '',
    id: el.id || '',
    href: (el as HTMLAnchorElement).href || '',
    disabled: (el as HTMLButtonElement).disabled || false,
    visible: true,
    selector: generateUniqueSelector(el),
    boundingBox: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      toJSON: () => rect,
    } as DOMRect,
  };
}

/**
 * 获取元素的可见文本
 */
function getElementText(el: HTMLElement): string {
  // input/textarea 用 value
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    return (el as HTMLInputElement).value || '';
  }
  // 其他元素用 innerText
  return (el.innerText || el.textContent || '').trim();
}

/**
 * 判断元素是否在视口内且可见
 */
function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  // 在视口内（或接近视口，预留 200px 缓冲区）
  const inViewport =
    rect.top < window.innerHeight + 200 &&
    rect.bottom > -200 &&
    rect.left < window.innerWidth + 200 &&
    rect.right > -200;

  // 不被 CSS 隐藏
  const notHidden =
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity) > 0;

  // 有实际尺寸
  const hasSize = rect.width > 0 && rect.height > 0;

  return inViewport && notHidden && hasSize;
}

/**
 * 生成唯一 CSS 选择器
 * 优先级：id → name → aria-label → nth-child 路径
 */
function generateUniqueSelector(el: HTMLElement): string {
  // 策略 1：id
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }

  // 策略 2：name 属性
  const name = el.getAttribute('name');
  if (name) {
    return `${el.tagName.toLowerCase()}[name="${name}"]`;
  }

  // 策略 3：aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return `${el.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
  }

  // 策略 4：data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  // 策略 5：nth-child 路径（最后兜底）
  return generateNthChildPath(el);
}

/**
 * 生成 nth-child 路径选择器
 */
function generateNthChildPath(el: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    // 添加 id 作为锚点（缩短路径）
    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    // 计算在同级同标签元素中的位置
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
