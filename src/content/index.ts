/**
 * AUI Content Script
 * 注入到每个网页中，负责：
 * 1. DOM 感知（提取页面可交互元素）
 * 2. 精灵 UI 渲染
 * 3. 动作执行
 */

import { extractPageContext } from './perception/ContentExtractor';
import { SpriteContainer } from './ui/SpriteContainer';
import { ActionExecutor } from './execution/ActionExecutor';
import type { BGMessage } from '../shared/types';

console.log('[AUI] Content Script loaded');

// 初始化精灵 UI
const sprite = new SpriteContainer();

// 初始化动作执行器
const actionExecutor = new ActionExecutor();

// 设置用户意图回调 → 发送给 Background Worker
sprite.setOnUserIntent((text: string) => {
  chrome.runtime.sendMessage({
    type: 'USER_INTENT',
    text,
  });
});

// 监听来自 Background Worker 的消息
chrome.runtime.onMessage.addListener((message: BGMessage, _sender, sendResponse) => {
  console.log('[AUI] Content Script received message:', message.type);

  switch (message.type) {
    case 'SPRITE_INTRO':
      sprite.showIntro(message.intro, message.suggestions);
      break;

    case 'SPRITE_RESPONSE':
      sprite.showResponse(message.message, message.emotion);
      break;

    case 'EXECUTE_ACTION':
      handleExecuteAction(message.actionId, message.tool, message.params);
      break;

    case 'HIGHLIGHT_ELEMENT':
      actionExecutor.highlightElement(message.selector);
      break;

    case 'UPDATE_SPRITE_STATE':
      sprite.setState(message.state);
      break;

    default:
      console.log('[AUI] Unknown message type');
  }

  sendResponse({ success: true });
});

/**
 * 处理动作执行指令
 */
async function handleExecuteAction(
  actionId: string,
  tool: string,
  params: Record<string, unknown>
): Promise<void> {
  sprite.setState('executing');

  try {
    const result = await actionExecutor.execute(tool, params);

    // 通知 Background Worker 执行结果
    chrome.runtime.sendMessage({
      type: 'ACTION_RESULT',
      actionId,
      result,
    });

    if (result.success) {
      sprite.setState('reporting');
    } else {
      sprite.setState('error');
      sprite.showResponse(`操作失败: ${result.error || '未知错误'}`, 'sad');
    }
  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'ACTION_RESULT',
      actionId,
      result: { success: false, tool, params, error: String(error) },
    });
    sprite.setState('error');
    sprite.showResponse(`操作出错: ${error}`, 'sad');
  }
}

// 页面加载完成后，提取页面上下文并通知 Background Worker
window.addEventListener('load', () => {
  console.log('[AUI] Page loaded, extracting context...');

  const pageContext = extractPageContext();
  console.log('[AUI] Page context extracted:', {
    url: pageContext.url,
    title: pageContext.title,
    interactiveCount: pageContext.interactiveElements.length,
    formCount: pageContext.forms.length,
  });

  // 发送 PAGE_LOADED 消息给 Background Worker
  chrome.runtime.sendMessage({
    type: 'PAGE_LOADED',
    pageContext,
  });
});
