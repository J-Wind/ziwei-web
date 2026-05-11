/* ============================================================
   追问组件 - 用于在解读后继续提问
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { useAuthStore } from '@/stores'

/* ------------------------------------------------------------
   Markdown 自定义样式组件 - 突出重点颜色
   ------------------------------------------------------------ */

const MarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold text-gold mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-semibold text-gold/90 mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-md font-medium text-star-light mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-gold font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-star-light not-italic font-medium">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none space-y-1 mb-2 pl-3">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 pl-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-3 before:content-['◆'] before:absolute before:left-0 before:text-star/60 before:text-xs">
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-gold/40 pl-3 my-2 italic text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    className ? (
      <code className={`${className} px-2 py-0.5 rounded bg-white/10 text-star-light text-sm`}>
        {children}
      </code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-sm">{children}</code>
    )
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a 
      href={href} 
      className="text-star-light hover:text-gold underline transition-colors"
      target="_blank" 
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

/* ------------------------------------------------------------
   自定义滚动条样式
   ------------------------------------------------------------ */

const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.2);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 215, 0, 0.4);
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 215, 0, 0.2) transparent;
  }
`

/* ------------------------------------------------------------
   追问组件 Props
   ------------------------------------------------------------ */

interface FollowUpQuestionProps {
  systemPrompt: string
  chatHistory: ChatMessage[]
  onChatHistoryChange: (history: ChatMessage[]) => void
  llmConfig: LLMConfig
  placeholder?: string
}

/* ------------------------------------------------------------
   追问组件
   ------------------------------------------------------------ */

export function FollowUpQuestion({
  systemPrompt,
  chatHistory,
  onChatHistoryChange,
  llmConfig,
  placeholder = "基于以上内容，有什么问题想问吗？",
}: FollowUpQuestionProps) {
  const { requireAuth } = useAuthStore()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const followUpConfig: LLMConfig = { ...llmConfig, operation: 'ai_followup' }

  // 只获取非系统消息的对话历史，并且跳过前两条（初始问题和回答）
  const userChatHistory = chatHistory.filter(msg => msg.role !== 'system').slice(2)

  // 当有新内容时自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [userChatHistory, currentAnswer])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setError(null)
    setCurrentAnswer('')

    try {
      // 构建新的对话历史
      const newMessage: ChatMessage = { role: 'user', content: question }
      const updatedHistory = [...chatHistory, newMessage]

      // 准备发送的消息
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...updatedHistory.filter(msg => msg.role !== 'system'),
      ]

      // 流式获取回答
      let fullAnswer = ''
      for await (const token of streamChat(followUpConfig, messages)) {
        fullAnswer += token
        setCurrentAnswer(fullAnswer)
      }

      // 保存对话历史
      const finalHistory = [...updatedHistory, { role: 'assistant', content: fullAnswer }]
      onChatHistoryChange(finalHistory)

      // 清空输入
      setQuestion('')
      setCurrentAnswer('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '提问失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [question, loading, chatHistory, systemPrompt, followUpConfig, onChatHistoryChange])

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <style>{scrollbarStyles}</style>
      <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
        <span>💬</span> 继续追问
      </h3>

      {/* 对话历史 */}
      {(userChatHistory.length > 0 || (loading && currentAnswer)) && (
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar" ref={scrollRef}>
          {userChatHistory.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-star/10 border border-star/20 ml-8'
                  : 'bg-white/5 border border-white/10 mr-8'
              }`}
            >
              <div className="text-xs text-text-muted mb-2 font-medium">
                {msg.role === 'user' ? '您' : '解读'}
              </div>
              <div className="text-text-secondary text-sm leading-relaxed">
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {/* 正在生成的回答 */}
          {loading && currentAnswer && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mr-8">
              <div className="text-xs text-text-muted mb-2 font-medium">解读</div>
              <div className="text-text-secondary text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {currentAnswer}
                </ReactMarkdown>
                <span className="inline-block w-1 h-4 bg-gold/60 animate-pulse ml-1 align-middle" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm mb-4 border border-misfortune/20">
          {error}
        </div>
      )}

      {/* 提问输入框 - 始终显示 */}
      <form onSubmit={(e) => { e.preventDefault(); requireAuth(() => handleSubmit(e)) }} className="space-y-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault()
                requireAuth(() => handleSubmit(e))
              }
            }}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text placeholder-text-muted resize-none focus:outline-none focus:border-star/50 focus:ring-1 focus:ring-star/30 min-h-[80px]"
            disabled={loading}
          />
          <div className="hidden md:block absolute bottom-2 right-3 text-[10px] text-text-muted/40">
            Enter 发送 / Shift+Enter 换行
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !question.trim()}
            size="sm"
            variant="gold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
                思考中
              </span>
            ) : '发送追问'}
          </Button>
        </div>
      </form>
    </div>
  )
}
