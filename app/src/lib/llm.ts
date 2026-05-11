/* ============================================================  多模型适配层  支持 Kimi / Gemini / Claude / DeepSeek  通过后端服务代理  ============================================================ */

export type ModelProvider = 'kimi' | 'gemini' | 'claude' | 'deepseek' | 'custom'

export interface LLMConfig {
  provider: ModelProvider
  model?: string
  enableThinking?: boolean
  enableWebSearch?: boolean
  operation?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}

/* ------------------------------------------------------------  Provider 配置（导出供设置面板使用）  ------------------------------------------------------------ */

export const PROVIDER_CONFIGS: Record<ModelProvider, { baseUrl: string; defaultModel: string }> = {
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2-0905-preview',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.0-flash',
  },
  claude: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-opus-4-5-20251124',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  custom: {
    baseUrl: '',
    defaultModel: '',
  },
}

/* ------------------------------------------------------------  后端服务代理  ------------------------------------------------------------ */

import { config as appConfig } from '../config/environment'

async function* streamWithBackend(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  try {
    const token = localStorage.getItem('ziwei-token')
    const response = await fetch(`${appConfig.apiBaseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        provider: config.provider,
        messages,
        operation: config.operation || 'ai_chart',
        config: {
          model: config.model,
          enableThinking: config.enableThinking,
          enableWebSearch: config.enableWebSearch,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API Error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // 处理不同模型的流格式
      if (config.provider === 'gemini') {
        // Gemini 返回的是 JSON 数组流
        try {
          const matches = buffer.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g)
          if (matches) {
            for (const match of matches) {
              const json = JSON.parse(match)
              if (json.text) {
                yield json.text
                buffer = buffer.replace(match, '')
              }
            }
          }
        } catch {
          // 继续读取
        }
      } else if (config.provider === 'claude') {
        // Claude 流格式
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6))
              // 处理普通文本输出
              if (json.type === 'content_block_delta') {
                if (json.delta?.type === 'text_delta') {
                  yield json.delta.text || ''
                }
              }
            } catch {
              // 忽略
            }
          }
        }
      } else {
        // OpenAI 兼容格式 (Kimi, DeepSeek)
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content
              if (content) yield content
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Backend API error:', error)
    throw error
  }
}

/* ------------------------------------------------------------  统一流式接口  ------------------------------------------------------------ */

// 简化的流式调用函数，固定使用 DeepSeek 模型
export async function* streamChat(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  // 强制使用 DeepSeek 模型
  const deepSeekConfig = { ...config, provider: 'deepseek' };
  yield* streamWithBackend(deepSeekConfig, messages)
}

/* ------------------------------------------------------------  便捷调用方法  ------------------------------------------------------------ */

export async function chat(
  config: LLMConfig,
  messages: ChatMessage[],
  callbacks?: StreamCallbacks
): Promise<string> {
  let fullText = ''

  try {
    for await (const token of streamChat(config, messages)) {
      fullText += token
      callbacks?.onToken?.(token)
    }
    callbacks?.onComplete?.(fullText)
  } catch (error) {
    callbacks?.onError?.(error as Error)
    throw error
  }

  return fullText
}

/* ------------------------------------------------------------  获取配置信息  ------------------------------------------------------------ */

export async function getConfig() {
  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/config`)
    if (!response.ok) throw new Error('Failed to get config')
    return await response.json()
  } catch (error) {
    console.warn('Failed to get config from backend, using default', error)
    return {
      models: Object.entries(PROVIDER_CONFIGS).map(([value, config]) => ({
        value,
        label: value === 'kimi' ? 'Kimi (月之暗面)' :
               value === 'gemini' ? 'Gemini (Google)' :
               value === 'claude' ? 'Claude (Anthropic)' :
               value === 'deepseek' ? 'DeepSeek' : value
      })),
      defaultProvider: 'kimi'
    }
  }
}