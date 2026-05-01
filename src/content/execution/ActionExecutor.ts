/**
 * ActionExecutor — 动作执行器
 * 在页面上执行 click、type、select、scroll 等操作
 */

import type { ActionResult } from '../../shared/types';

export class ActionExecutor {
  /**
   * 执行动作
   */
  async execute(tool: string, params: Record<string, unknown>): Promise<ActionResult> {
    switch (tool) {
      case 'click_element':
        return this.clickElement(params.selector as string);
      case 'type_text':
        return this.typeText(params.selector as string, params.text as string);
      case 'select_option':
        return this.selectOption(params.selector as string, params.value as string);
      case 'scroll_page':
        return this.scrollPage(params.direction as string, params.amount as number);
      default:
        return {
          success: false,
          tool,
          params,
          error: `未知工具: ${tool}`,
        };
    }
  }

  /**
   * 点击元素
   */
  private async clickElement(selector: string): Promise<ActionResult> {
    try {
      const el = this.findElement(selector);
      if (!el) {
        return { success: false, tool: 'click_element', params: { selector }, error: `未找到元素: ${selector}` };
      }

      // 高亮元素
      this.highlightElement(selector);

      // 拟人化延迟
      await this.delay(200 + Math.random() * 400);

      // 滚动到可见区域
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(300);

      // 执行点击
      (el as HTMLElement).click();

      return { success: true, tool: 'click_element', params: { selector } };
    } catch (error) {
      return { success: false, tool: 'click_element', params: { selector }, error: String(error) };
    }
  }

  /**
   * 输入文本
   */
  private async typeText(selector: string, text: string): Promise<ActionResult> {
    try {
      const el = this.findElement(selector) as HTMLInputElement | HTMLTextAreaElement;
      if (!el) {
        return { success: false, tool: 'type_text', params: { selector, text }, error: `未找到元素: ${selector}` };
      }

      // 高亮元素
      this.highlightElement(selector);

      // 聚焦
      el.focus();
      await this.delay(100);

      // 清空现有内容
      el.value = '';

      // 逐字符输入（模拟人类打字）
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await this.delay(50 + Math.random() * 100);
      }

      // 触发 change 事件
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, tool: 'type_text', params: { selector, text } };
    } catch (error) {
      return { success: false, tool: 'type_text', params: { selector, text }, error: String(error) };
    }
  }

  /**
   * 选择下拉选项
   */
  private async selectOption(selector: string, value: string): Promise<ActionResult> {
    try {
      const el = this.findElement(selector) as HTMLSelectElement;
      if (!el) {
        return { success: false, tool: 'select_option', params: { selector, value }, error: `未找到元素: ${selector}` };
      }

      this.highlightElement(selector);
      await this.delay(200);

      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, tool: 'select_option', params: { selector, value } };
    } catch (error) {
      return { success: false, tool: 'select_option', params: { selector, value }, error: String(error) };
    }
  }

  /**
   * 滚动页面
   */
  private async scrollPage(direction: string, amount: number): Promise<ActionResult> {
    try {
      const scrollAmount = direction === 'down' ? amount : -amount;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });

      return { success: true, tool: 'scroll_page', params: { direction, amount } };
    } catch (error) {
      return { success: false, tool: 'scroll_page', params: { direction, amount }, error: String(error) };
    }
  }

  /**
   * 高亮元素（视觉反馈）
   */
  highlightElement(selector: string): void {
    try {
      const el = this.findElement(selector);
      if (!el) return;

      const originalOutline = (el as HTMLElement).style.outline;
      const originalTransition = (el as HTMLElement).style.transition;

      (el as HTMLElement).style.transition = 'outline 0.2s ease';
      (el as HTMLElement).style.outline = '3px solid #7c3aed';

      setTimeout(() => {
        (el as HTMLElement).style.outline = originalOutline;
        (el as HTMLElement).style.transition = originalTransition;
      }, 1500);
    } catch {
      // 高亮失败不影响主流程
    }
  }

  /**
   * 根据选择器查找元素
   */
  private findElement(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
