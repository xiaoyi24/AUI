/**
 * SpriteContainer — 小精灵 UI 容器
 * 使用 Shadow DOM 隔离样式，管理精灵的完整生命周期
 */

import type { SpriteState, SpriteEmotion } from '../../shared/types';

/** 精灵状态对应的 CSS 类名 */
const STATE_CLASS_MAP: Record<SpriteState, string> = {
  idle: 'sprite-idle',
  introducing: 'sprite-introducing',
  listening: 'sprite-listening',
  thinking: 'sprite-thinking',
  executing: 'sprite-executing',
  reporting: 'sprite-reporting',
  asking: 'sprite-asking',
  error: 'sprite-error',
};

/** 精灵情绪对应的表情符号 */
const EMOTION_EMOJI_MAP: Record<SpriteEmotion, string> = {
  happy: '😊',
  thinking: '🤔',
  busy: '🏃',
  surprised: '😮',
  sad: '😢',
  neutral: '👋',
};

export class SpriteContainer {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private spriteEl: HTMLElement | null = null;
  private bubbleEl: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private suggestionsEl: HTMLElement | null = null;
  private currentState: SpriteState = 'idle';
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private onUserIntent: ((text: string) => void) | null = null;

  constructor() {
    // 创建宿主元素
    this.host = document.createElement('div');
    this.host.id = 'aui-sprite-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    this.injectStyles();
    this.buildDOM();
    this.bindEvents();
    this.attachToPage();
  }

  /**
   * 注入样式（Shadow DOM 内，不污染宿主页面）
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        pointer-events: none;
      }

      .container {
        position: relative;
        pointer-events: auto;
        user-select: none;
      }

      /* ===== 精灵角色 ===== */
      .sprite {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        cursor: grab;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        position: relative;
        margin-left: auto;
      }

      .sprite:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(124, 58, 237, 0.6);
      }

      .sprite:active {
        cursor: grabbing;
      }

      /* 精灵状态动画 */
      .sprite-idle {
        animation: float 3s ease-in-out infinite;
      }

      .sprite-introducing {
        animation: bounceIn 0.6s ease-out;
      }

      .sprite-listening {
        animation: pulse 1.5s ease-in-out infinite;
      }

      .sprite-thinking {
        animation: spin 1s linear infinite;
      }

      .sprite-executing {
        animation: shake 0.5s ease-in-out infinite;
      }

      .sprite-reporting {
        animation: pop 0.4s ease-out;
      }

      .sprite-asking {
        animation: pulse 1s ease-in-out infinite;
      }

      .sprite-error {
        animation: shake 0.3s ease-in-out 2;
        background: linear-gradient(135deg, #ef4444, #f87171);
      }

      /* ===== 对话气泡 ===== */
      .bubble {
        position: absolute;
        bottom: 80px;
        right: 0;
        min-width: 200px;
        max-width: 320px;
        background: white;
        color: #1f2937;
        border-radius: 16px;
        padding: 12px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        font-size: 14px;
        line-height: 1.5;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }

      .bubble.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .bubble::after {
        content: '';
        position: absolute;
        bottom: -8px;
        right: 24px;
        width: 16px;
        height: 16px;
        background: white;
        transform: rotate(45deg);
        box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.06);
      }

      .bubble-text {
        margin-bottom: 8px;
      }

      /* ===== 建议按钮 ===== */
      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .suggestion-btn {
        padding: 6px 12px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        font-size: 12px;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .suggestion-btn:hover {
        background: #7c3aed;
        color: white;
        border-color: #7c3aed;
      }

      /* ===== 输入框 ===== */
      .input-area {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .input-area input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
      }

      .input-area input:focus {
        border-color: #7c3aed;
      }

      .input-area button {
        padding: 8px 16px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 20px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .input-area button:hover {
        background: #6d28d9;
      }

      /* ===== 动画关键帧 ===== */
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      @keyframes bounceIn {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
      }

      @keyframes pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
    `;
    this.shadow.appendChild(style);
  }

  /**
   * 构建 DOM 结构
   */
  private buildDOM(): void {
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
      <div class="bubble" id="bubble">
        <div class="bubble-text" id="bubbleText"></div>
        <div class="suggestions" id="suggestions"></div>
        <div class="input-area" id="inputArea" style="display:none">
          <input type="text" id="userInput" placeholder="输入你的指令..." />
          <button id="sendBtn">发送</button>
        </div>
      </div>
      <div class="sprite sprite-idle" id="sprite">🧚</div>
    `;

    this.shadow.appendChild(container);

    // 缓存 DOM 引用
    this.spriteEl = this.shadow.getElementById('sprite');
    this.bubbleEl = this.shadow.getElementById('bubble');
    this.inputEl = this.shadow.getElementById('userInput') as HTMLInputElement;
    this.suggestionsEl = this.shadow.getElementById('suggestions');
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 精灵点击 → 显示/隐藏气泡
    this.spriteEl?.addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.toggleBubble();
      }
    });

    // 拖拽
    this.spriteEl?.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = false;
      const rect = this.host.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const onMove = (ev: MouseEvent) => {
        this.isDragging = true;
        this.host.style.right = 'auto';
        this.host.style.bottom = 'auto';
        this.host.style.left = `${ev.clientX - this.dragOffset.x}px`;
        this.host.style.top = `${ev.clientY - this.dragOffset.y}px`;
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // 发送按钮
    this.shadow.getElementById('sendBtn')?.addEventListener('click', () => {
      this.submitInput();
    });

    // 回车发送
    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.submitInput();
      }
    });
  }

  /**
   * 将宿主元素挂载到页面
   */
  private attachToPage(): void {
    document.body.appendChild(this.host);
  }

  // ============================================================
  // 公开 API
  // ============================================================

  /**
   * 设置用户意图回调
   */
  setOnUserIntent(callback: (text: string) => void): void {
    this.onUserIntent = callback;
  }

  /**
   * 显示介绍信息
   */
  showIntro(intro: string, suggestions: string[]): void {
    this.setState('introducing');
    this.showBubble(intro, suggestions);
    // 介绍动画结束后回到 idle
    setTimeout(() => {
      if (this.currentState === 'introducing') {
        this.setState('idle');
      }
    }, 3000);
  }

  /**
   * 显示回复消息
   */
  showResponse(message: string, emotion: SpriteEmotion = 'neutral'): void {
    this.setState('reporting');
    this.showBubble(message);
    this.updateEmotion(emotion);

    setTimeout(() => {
      if (this.currentState === 'reporting') {
        this.setState('idle');
      }
    }, 2000);
  }

  /**
   * 设置精灵状态
   */
  setState(state: SpriteState): void {
    if (!this.spriteEl) return;

    // 移除旧状态类
    Object.values(STATE_CLASS_MAP).forEach((cls) => {
      this.spriteEl!.classList.remove(cls);
    });

    // 添加新状态类
    const newClass = STATE_CLASS_MAP[state];
    if (newClass) {
      this.spriteEl.classList.add(newClass);
    }

    this.currentState = state;
  }

  /**
   * 更新精灵表情
   */
  private updateEmotion(emotion: SpriteEmotion): void {
    if (!this.spriteEl) return;
    const emoji = EMOTION_EMOJI_MAP[emotion] || '🧚';
    this.spriteEl.textContent = emoji;
  }

  /**
   * 显示对话气泡
   */
  private showBubble(text: string, suggestions?: string[]): void {
    if (!this.bubbleEl) return;

    const textEl = this.shadow.getElementById('bubbleText');
    if (textEl) {
      textEl.textContent = text;
    }

    // 渲染建议按钮
    if (this.suggestionsEl) {
      this.suggestionsEl.innerHTML = '';
      if (suggestions && suggestions.length > 0) {
        suggestions.forEach((s) => {
          const btn = document.createElement('button');
          btn.className = 'suggestion-btn';
          btn.textContent = s;
          btn.addEventListener('click', () => {
            if (this.onUserIntent) {
              this.onUserIntent(s);
            }
            this.setState('thinking');
            this.showBubble('正在思考...');
          });
          this.suggestionsEl!.appendChild(btn);
        });
      }
    }

    // 显示输入框
    const inputArea = this.shadow.getElementById('inputArea');
    if (inputArea) {
      inputArea.style.display = 'flex';
    }

    this.bubbleEl.classList.add('visible');
  }

  /**
   * 切换气泡显示/隐藏
   */
  private toggleBubble(): void {
    if (!this.bubbleEl) return;
    const isVisible = this.bubbleEl.classList.contains('visible');
    if (isVisible) {
      this.bubbleEl.classList.remove('visible');
    } else {
      this.setState('listening');
      this.showBubble('你好！有什么可以帮你的吗？😊');
    }
  }

  /**
   * 提交用户输入
   */
  private submitInput(): void {
    if (!this.inputEl) return;
    const text = this.inputEl.value.trim();
    if (!text) return;

    this.inputEl.value = '';
    this.setState('thinking');
    this.showBubble('正在思考...');

    if (this.onUserIntent) {
      this.onUserIntent(text);
    }
  }

  /**
   * 销毁精灵
   */
  destroy(): void {
    this.host.remove();
  }
}
