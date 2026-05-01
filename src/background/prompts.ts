/**
 * Prompt 模板 — Agent 的 System Prompt 和各类分析 Prompt
 */

import type { PageContext } from '../shared/types';

/**
 * System Prompt — 定义 Agent 的角色和行为准则
 */
export const SYSTEM_PROMPT = `你是一个名为"小A"的AI浏览器助手精灵。你漂浮在网页之上，帮助用户理解和使用当前网站。

## 你的能力
- 分析网页结构，理解网站功能
- 用自然语言与用户对话
- 在网页上执行操作（点击、输入、选择、滚动等）

## 行为准则
1. **友好热情**：用活泼可爱的语气与用户交流，适当使用 emoji
2. **简洁明了**：回复控制在 2-3 句话以内，不要长篇大论
3. **安全第一**：涉及支付、密码、个人隐私时，必须提醒用户注意
4. **诚实透明**：不确定的事情要明确告知用户，不要编造信息
5. **主动服务**：发现用户可能需要的帮助时，主动提出建议

## 输出格式
当需要执行操作时，使用以下 JSON 格式：
\`\`\`json
{"action": "工具名", "params": {...}}
\`\`\`

可用工具：
- click_element: 点击元素，params: { selector: "CSS选择器" }
- type_text: 输入文本，params: { selector: "CSS选择器", text: "输入内容" }
- select_option: 选择下拉选项，params: { selector: "CSS选择器", value: "选项值" }
- scroll_page: 滚动页面，params: { direction: "up|down", amount: 像素数 }
- ask_user: 询问用户，params: { question: "问题" }
- complete_task: 任务完成，params: { summary: "完成摘要" }`;

/**
 * 构建页面分析 Prompt
 * 让 LLM 分析页面功能并生成介绍
 */
export function buildPageAnalysisPrompt(pageContext: PageContext): string {
  const elementsSummary = pageContext.interactiveElements
    .slice(0, 30) // 限制数量，控制 token
    .map((el) => `- [${el.tag}] "${el.text || el.ariaLabel || el.placeholder}" (selector: ${el.selector})`)
    .join('\n');

  const formsSummary = pageContext.forms
    .map((form) => {
      const fields = form.fields
        .map((f) => `  - ${f.label} (${f.inputType}${f.required ? ', 必填' : ''})`)
        .join('\n');
      return `表单 (${form.method} ${form.action}):\n${fields}`;
    })
    .join('\n\n');

  return `请分析以下网页，用2-3句话告诉用户这个网站能做什么，并给出2-3个操作建议。

页面信息：
- URL: ${pageContext.url}
- 标题: ${pageContext.title}
- 描述: ${pageContext.description}

可交互元素（共${pageContext.interactiveElements.length}个，展示前30个）：
${elementsSummary}

${formsSummary ? '表单结构：\n' + formsSummary : ''}

请用中文回复，格式如下：
介绍：[2-3句话的网站功能介绍]
建议：
- [建议1]
- [建议2]
- [建议3]`;
}

/**
 * 构建用户意图处理 Prompt
 * 让 LLM 根据用户意图规划操作步骤
 */
export function buildIntentPrompt(
  userIntent: string,
  pageContext: PageContext,
  conversationHistory: string
): string {
  const elementsSummary = pageContext.interactiveElements
    .slice(0, 30)
    .map((el) => `- [${el.tag}] "${el.text || el.ariaLabel || el.placeholder}" → selector: ${el.selector}`)
    .join('\n');

  return `当前页面: ${pageContext.title} (${pageContext.url})

页面可交互元素：
${elementsSummary}

${conversationHistory ? '对话历史：\n' + conversationHistory : ''}

用户说："${userIntent}"

请根据用户意图，决定下一步操作。如果需要执行操作，返回 JSON 格式的动作指令。
如果只是回复用户，直接返回文本回复。
如果需要用户确认或补充信息，使用 ask_user 工具。`;
}
