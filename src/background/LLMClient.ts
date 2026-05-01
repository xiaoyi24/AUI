/**
 * LLMClient — LLM API 客户端
 * 封装 OpenAI 兼容接口调用，支持多 Provider 切换
 */

interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM 客户端类
 * 兼容 OpenAI / DeepSeek / GLM / 通义千问 等接口
 */
export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * 发送聊天请求（非流式）
   */
  async chat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 发送聊天请求（流式，返回 AsyncGenerator）
   */
  async *chatStream(messages: ChatMessage[], temperature = 0.3): AsyncGenerator<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // 跳过解析失败的行
        }
      }
    }
  }
}

/**
 * 从 chrome.storage 加载 LLM 配置
 */
export async function loadLLMConfig(): Promise<LLMConfig> {
  const result = await chrome.storage.local.get(['llmConfig']);

  if (result.llmConfig) {
    return result.llmConfig as LLMConfig;
  }

  // 默认配置（用户需要在设置中填写）
  return {
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com',
  };
}

/**
 * 保存 LLM 配置到 chrome.storage
 */
export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  await chrome.storage.local.set({ llmConfig: config });
}
