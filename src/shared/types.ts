/**
 * AUI 共享类型定义
 * Content Script 和 Background Worker 共用的类型
 */

// ============================================================
// 感知层类型
// ============================================================

/** 页面上下文 — 感知层提取的完整页面结构 */
export interface PageContext {
  url: string;
  title: string;
  description: string;
  interactiveElements: InteractiveElement[];
  forms: FormSchema[];
  contentBlocks: ContentBlock[];
  navigation: NavItem[];
}

/** 可交互元素 */
export interface InteractiveElement {
  tag: string;           // 'button' | 'a' | 'input' | 'select' | 'textarea'
  type: string;          // 'submit' | 'text' | 'checkbox' | 'radio' | ''
  text: string;          // 可见文本
  ariaLabel: string;     // 无障碍标签
  placeholder: string;   // 占位符文本
  name: string;          // name 属性
  id: string;            // id 属性
  href: string;          // a 标签的链接
  disabled: boolean;
  visible: boolean;
  selector: string;      // 唯一 CSS 选择器（用于后续操作）
  boundingBox: DOMRect;  // 位置信息
}

/** 表单结构 */
export interface FormSchema {
  id: string;
  action: string;        // form action 属性
  method: string;        // GET | POST
  fields: FormField[];
}

/** 表单字段 */
export interface FormField {
  label: string;         // 字段标签文本
  inputType: string;     // text | password | select | checkbox | radio | textarea
  required: boolean;
  placeholder: string;
  name: string;
  selector: string;      // 唯一 CSS 选择器
  options: SelectOption[] | null;  // select 元素的选项
  currentValue: string;
  validation: FieldValidation;
}

/** 下拉框选项 */
export interface SelectOption {
  value: string;
  text: string;
  selected: boolean;
}

/** 字段验证规则 */
export interface FieldValidation {
  minLength: number;
  maxLength: number;
  pattern: string;
}

/** 内容块 */
export interface ContentBlock {
  role: string;          // 'main' | 'article' | 'section' | 'aside'
  textSummary: string;   // 文本摘要（前200字符）
  childCount: number;    // 子元素数量
}

/** 导航项 */
export interface NavItem {
  text: string;
  href: string;
}

// ============================================================
// 消息协议类型
// ============================================================

/** Content Script → Background Worker */
export type CSMessage =
  | { type: 'PAGE_LOADED'; pageContext: PageContext }
  | { type: 'PAGE_CHANGED'; changes: PageChange[] }
  | { type: 'USER_INTENT'; text: string; voice?: boolean }
  | { type: 'ACTION_RESULT'; actionId: string; result: ActionResult }
  | { type: 'USER_INTERRUPT'; reason: string };

/** Background Worker → Content Script */
export type BGMessage =
  | { type: 'SPRITE_INTRO'; intro: string; suggestions: string[] }
  | { type: 'SPRITE_RESPONSE'; message: string; emotion: SpriteEmotion }
  | { type: 'EXECUTE_ACTION'; actionId: string; tool: string; params: Record<string, unknown> }
  | { type: 'HIGHLIGHT_ELEMENT'; selector: string }
  | { type: 'UPDATE_SPRITE_STATE'; state: SpriteState };

/** 页面变化 */
export interface PageChange {
  type: 'added' | 'removed' | 'modified';
  element: InteractiveElement;
}

/** 动作执行结果 */
export interface ActionResult {
  success: boolean;
  tool: string;
  params: Record<string, unknown>;
  error?: string;
  screenshot?: string;  // base64
}

// ============================================================
// 精灵 UI 类型
// ============================================================

/** 精灵情绪 */
export type SpriteEmotion = 'happy' | 'thinking' | 'busy' | 'surprised' | 'sad' | 'neutral';

/** 精灵状态 */
export type SpriteState = 'idle' | 'introducing' | 'listening' | 'thinking' | 'executing' | 'reporting' | 'asking' | 'error';

// ============================================================
// Agent 类型
// ============================================================

/** Agent 状态 */
export interface AgentState {
  sessionId: string;
  pageUrl: string;
  conversationHistory: ConversationMessage[];
  actionHistory: ActionRecord[];
  currentTask: Task | null;
  pageContext: PageContext | null;
}

/** 对话消息 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/** 动作记录 */
export interface ActionRecord {
  timestamp: number;
  tool: string;
  params: Record<string, unknown>;
  result: 'success' | 'failure' | 'pending';
  screenshot?: string;
  error?: string;
}

/** 任务 */
export interface Task {
  id: string;
  description: string;
  steps: TaskStep[];
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/** 任务步骤 */
export interface TaskStep {
  index: number;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
