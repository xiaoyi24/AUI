/**
 * AUI Background Service Worker
 * 负责：
 * 1. Agent 核心逻辑（LLM 调用、任务规划）
 * 2. 消息路由（Content Script ↔ Background）
 * 3. 存储管理
 */

import { LLMClient, loadLLMConfig } from './LLMClient';
import { SYSTEM_PROMPT, buildPageAnalysisPrompt, buildIntentPrompt } from './prompts';
import type { PageContext, AgentState, ConversationMessage } from '../shared/types';

console.log('[AUI] Background Service Worker started');

// Agent 全局状态
let agentState: AgentState = {
  sessionId: generateSessionId(),
  pageUrl: '',
  conversationHistory: [],
  actionHistory: [],
  currentTask: null,
  pageContext: null,
};

// LLM 客户端（延迟初始化）
let llmClient: LLMClient | null = null;

/**
 * 获取或初始化 LLM 客户端
 */
async function getLLMClient(): Promise<LLMClient> {
  if (!llmClient) {
    const config = await loadLLMConfig();
    if (!config.apiKey) {
      throw new Error('请先在扩展设置中配置 LLM API Key');
    }
    llmClient = new LLMClient(config);
  }
  return llmClient;
}

// 监听来自 Content Script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AUI] Background received message:', message.type);

  switch (message.type) {
    case 'PAGE_LOADED':
      handlePageLoaded(message.pageContext, sender, sendResponse);
      break;

    case 'PAGE_CHANGED':
      handlePageChanged(message.changes, sender, sendResponse);
      break;

    case 'USER_INTENT':
      handleUserIntent(message.text, sender, sendResponse);
      break;

    case 'ACTION_RESULT':
      handleActionResult(message.actionId, message.result, sender, sendResponse);
      break;

    default:
      console.log('[AUI] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理页面加载完成消息
 * 调用 LLM 分析页面结构，生成介绍信息
 */
async function handlePageLoaded(
  pageContext: PageContext,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[AUI] Page loaded:', pageContext.url);

  // 更新 Agent 状态
  agentState.pageUrl = pageContext.url;
  agentState.pageContext = pageContext;
  agentState.conversationHistory = [];

  try {
    const llm = await getLLMClient();
    const analysisPrompt = buildPageAnalysisPrompt(pageContext);

    const response = await llm.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: analysisPrompt },
    ]);

    // 解析 LLM 返回的介绍和建议
    const { intro, suggestions } = parseIntroResponse(response);

    // 发送介绍信息给 Content Script
    const tabId = sender.tab?.id;
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SPRITE_INTRO',
        intro,
        suggestions,
      });
    }

    // 记录对话历史
    agentState.conversationHistory.push({
      role: 'assistant',
      content: intro,
      timestamp: Date.now(),
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('[AUI] Page analysis failed:', error);

    // 即使 LLM 不可用，也发送默认介绍
    const tabId = sender.tab?.id;
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SPRITE_INTRO',
        intro: `你好！我检测到你正在浏览 ${pageContext.title || '这个网站'}。需要我帮你做什么吗？`,
        suggestions: ['这个网站能做什么？', '帮我总结页面内容', '帮我填写表单'],
      });
    }

    sendResponse({ success: false, error: String(error) });
  }
}

/**
 * 处理页面变化消息
 */
async function handlePageChanged(
  changes: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[AUI] Page changed:', changes);
  sendResponse({ success: true });
}

/**
 * 处理用户意图消息
 * 调用 LLM 分析意图 + 规划操作
 */
async function handleUserIntent(
  text: string,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[AUI] User intent:', text);

  if (!agentState.pageContext) {
    sendResponse({ success: false, error: 'No page context available' });
    return;
  }

  // 记录用户消息
  agentState.conversationHistory.push({
    role: 'user',
    content: text,
    timestamp: Date.now(),
  });

  try {
    const llm = await getLLMClient();
    const historyStr = formatConversationHistory(agentState.conversationHistory);
    const intentPrompt = buildIntentPrompt(text, agentState.pageContext, historyStr);

    const response = await llm.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: intentPrompt },
    ]);

    // 尝试解析 JSON 动作指令
    const action = parseActionResponse(response);
    const tabId = sender.tab?.id;

    if (action && tabId) {
      // 发送执行动作指令
      await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_ACTION',
        actionId: generateActionId(),
        tool: action.action,
        params: action.params,
      });
    } else if (tabId) {
      // 纯文本回复
      await chrome.tabs.sendMessage(tabId, {
        type: 'SPRITE_RESPONSE',
        message: response,
        emotion: 'neutral',
      });
    }

    // 记录助手回复
    agentState.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('[AUI] Intent processing failed:', error);

    const tabId = sender.tab?.id;
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SPRITE_RESPONSE',
        message: '抱歉，我暂时无法处理这个请求。请检查 API 配置或稍后再试。',
        emotion: 'sad',
      });
    }

    sendResponse({ success: false, error: String(error) });
  }
}

/**
 * 处理动作执行结果
 */
async function handleActionResult(
  actionId: string,
  result: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[AUI] Action result:', actionId, result);
  sendResponse({ success: true });
}

// ============================================================
// 辅助函数
// ============================================================

function generateSessionId(): string {
  return `aui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateActionId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 解析 LLM 返回的页面介绍
 */
function parseIntroResponse(response: string): { intro: string; suggestions: string[] } {
  const introMatch = response.match(/介绍[：:]\s*(.+?)(?=建议[：:]|\n\n|$)/s);
  const intro = introMatch?.[1]?.trim() || response.split('\n')[0]?.trim() || '你好！需要我帮你做什么吗？';

  const suggestions: string[] = [];
  const suggestionRegex = /[-*]\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = suggestionRegex.exec(response)) !== null) {
    suggestions.push(match[1].trim());
  }

  if (suggestions.length === 0) {
    suggestions.push('这个网站能做什么？', '帮我总结页面内容');
  }

  return { intro, suggestions: suggestions.slice(0, 3) };
}

/**
 * 解析 LLM 返回的 JSON 动作指令
 */
function parseActionResponse(response: string): { action: string; params: Record<string, unknown> } | null {
  // 尝试匹配 ```json ... ``` 代码块
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch?.[1]?.trim() || response.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.action && parsed.params) {
      return { action: parsed.action, params: parsed.params };
    }
  } catch {
    // 不是 JSON 格式，说明是纯文本回复
  }

  return null;
}

/**
 * 格式化对话历史为字符串
 */
function formatConversationHistory(history: ConversationMessage[]): string {
  return history
    .slice(-6) // 只保留最近 6 条
    .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
    .join('\n');
}
