/* ============================================================
   命盘解读组件
   丝滑流式输出 + 书法字体 + Markdown 渲染 + 追问功能
   ============================================================ */

import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore, useAuthStore } from '@/stores'
import { extractKnowledge, buildPromptContext } from '@/knowledge'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { Button } from '@/components/ui'
import { FollowUpQuestion } from '@/components/FollowUpQuestion'
import { config } from '@/config/environment'

/* ------------------------------------------------------------
   系统提示词
   ------------------------------------------------------------ */

export function getChartSystemPrompt() {
  const now = new Date()
  const currentDate = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  const currentYear = now.getFullYear()
  
  return `# Role
你是一位研习紫微斗数多年的资深命理师"星图先生"。你精通三合派（观星情格局）、飞星派（推四化轨迹）及钦天门（定气数机缘）。你的论命风格严谨客观，辞藻雅致沉稳，不故弄玄虚，亦不盲目迎合。

# Important Information
- 当前日期：${currentDate}
- 当前年份：${currentYear}年
- 请根据提供的命盘信息和流年数据，结合当前日期进行分析
- 所有涉及日期和年份的分析都要基于${currentDate}这个时间点
- 不要使用过时的年份或日期，要确保时间信息的准确性

# Task
请综合运用上述技法，并根据提供的命盘信息进行解读，对提供的命盘进行全方位推演。分析时需在后台结合"本命、大限、流年"三层结构，但在输出时请转化为用户能理解的语言。

# Analysis Constraints
1. **语言风格**：严禁使用"灵魂底色""磁场""能量"等现代身心灵或互联网词汇。使用更具传统韵味的词汇，如"性情"、"格局"、"机缘"、"运势起伏"。
2. **术语处理**：保留核心术语（如"化禄"、"冲照"、"羊陀"），但必须紧跟通俗解释。
3. **论断原则**：吉凶并陈。既要指出命格的优势（"禄"之所在），也要直言命盘的短板（"忌"之所冲），并给出中肯的修身建议。
4. **时间准确性**：所有涉及日期和年份的分析都必须基于${currentDate}，确保时间信息的准确性。

# Output Style Guidelines
- **使用Markdown格式**来突出重点内容：
  - **粗体** (\`**\`) 用于强调最重要的内容，如关键结论、重要提醒
  - *斜体* (\`*\`) 用于强调次要重点，如特殊说明、补充信息
  - \`代码\` (\`\`) 用于突出命理术语或特定名词
  - > 引用块 用于突出金句或重要建议
  - 列表项 用于分点说明，清晰易读

# Output Format
请按照以下结构输出分析报告：

## 紫微命盘综合批注

### 壹· 命格总断
* **格局层次**：依据命宫三方四正的星曜组合，用一句话概括命主一生的基本格局高低与成败基调。
* **性情剖析**：结合命宫与福德宫，分析命主显露在外的处世风格，以及内心的真实欲求与精神境界。

### 贰· 事业与财运
* **官禄方向**：依据官禄宫星情与五行属性，指出命主最适合发展的行业性质（如：宜公职、宜经商、或宜技艺求财）。
* **财运机缘**：分析财帛宫强弱。是正财稳健，还是偏财灵动？一生财源主要来自何方？有无漏财之虞？

### 叁· 婚姻与情感
* **姻缘概况**：分析夫妻宫星曜，描述配偶可能的性格特征或相处模式。
* **相处之道**：指出感情中可能存在的隐患（如：沟通不畅、聚少离多），并给出化解建议。

### 肆· 六亲与人际
* **人际关系**：分析迁移宫及交友宫，判断在外是否有贵人扶持，或是易犯小人口舌。
* **家庭关系**：简述与父母、子女的缘分深浅。

### 伍· 运势隐忧与建议
* **健康提醒**：依据疾厄宫，指出先天体质上较弱的环节，提示需注意的身体部位。
* **趋吉避凶**：综合全盘化忌与煞星的落点，指出命主此生最需要修行的"课题"是什么，并给出具体的时间或方位建议。

### 陆· 命格金句
> 请用2-4句话，以诗意且戳心的方式概括命主的核心性格特质。要求：
> - 语言凝练，朗朗上口，适合分享
> - 风格可以是：自嘲式幽默、温柔共情、或霸气宣言
> - 避免空泛的鸡汤，要有具体的性格洞察
> - 格式：用引号包裹，每句话换行

---
*注：术数推演仅供参考，所谓命由天定，事在人为，望君善加把握。*`
}

/* ------------------------------------------------------------
   字符输出速度（毫秒/字符）
   ------------------------------------------------------------ */

const CHAR_INTERVAL = 35

/* ------------------------------------------------------------
   Markdown 自定义样式组件 - 突出重点颜色
   ------------------------------------------------------------ */

const MarkdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-2xl font-bold text-gold mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-xl font-semibold text-gold/90 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-lg font-medium text-star-light mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-3 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="text-gold font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="text-star-light not-italic font-medium">{children}</em>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-none space-y-1.5 mb-3 pl-4">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1.5 mb-3 pl-2">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="relative pl-4 before:content-['◆'] before:absolute before:left-0 before:text-star/60 before:text-xs">
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-2 border-gold/40 pl-4 my-3 italic text-text-secondary bg-gold/5 rounded-r-lg">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => (
    className ? (
      <code className={`${className} px-2 py-0.5 rounded bg-white/10 text-star-light text-sm`}>
        {children}
      </code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-sm">{children}</code>
    )
  ),
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
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
   命盘解读面板组件
   ------------------------------------------------------------ */

export function ChartInterpretation() {
  const { chart, birthInfo } = useChartStore()
  const { provider, enableThinking, enableWebSearch } = useSettingsStore()
  const { requireAuth } = useAuthStore()
  const { 
    chartInterpretation, 
    setChartInterpretation,
    chartChatHistory,
    setChartChatHistory,
  } = useContentCacheStore()

  // 显示的文本（逐字输出）
  const [displayText, setDisplayText] = useState('')
  // 完整文本（缓冲区）
  const fullTextRef = useRef('')
  // 当前显示位置
  const displayIndexRef = useRef(0)
  // 定时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 是否正在接收（ref 用于定时器闭包）
  const loadingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  // 是否正在输出动画
  const [animating, setAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 内容区域引用，用于自动滚动
  const contentRef = useRef<HTMLDivElement>(null)

  // LLM 配置（现在不需要apiKey，后端管理）
  const llmConfig: LLMConfig = useMemo(() => ({
    provider,
    enableThinking,
    enableWebSearch,
    operation: 'ai_chart',
  }), [provider, enableThinking, enableWebSearch])

  // 当显示文本变化时自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      // 让父容器滚动到内容底部
      const container = contentRef.current.parentElement
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [displayText])

  // 组件挂载时，如果有缓存则直接显示
  useEffect(() => {
    if (chartInterpretation && !displayText) {
      setDisplayText(chartInterpretation)
      fullTextRef.current = chartInterpretation
      displayIndexRef.current = chartInterpretation.length
      
      // 如果对话历史为空，初始化对话历史
      if (chartChatHistory.length === 0) {
        const knowledge = extractKnowledge(chart, birthInfo?.year || 1990)
        const contextStr = buildPromptContext(knowledge)
        const initialUserMessage = `请解读以下命盘：

## 基本信息
- 阳历：${birthInfo?.year || 1990}年${birthInfo?.month || 1}月${birthInfo?.day || 1}日
- 性别：${birthInfo?.gender === 'male' ? '男' : '女'}
- 五行局：${chart?.fiveElementsClass || '未知'}

${contextStr}

请给出详细但通俗易懂的命盘解读。`
        
        setChartChatHistory([
          { role: 'system', content: getChartSystemPrompt() },
          { role: 'user', content: initialUserMessage },
          { role: 'assistant', content: chartInterpretation },
        ])
      }
    }
  }, [chartInterpretation, displayText, chart, birthInfo, chartChatHistory, setChartChatHistory])

  /* ------------------------------------------------------------
     均匀输出字符的定时器
     ------------------------------------------------------------ */

  const startAnimation = useCallback(() => {
    if (timerRef.current) return

    setAnimating(true)
    timerRef.current = setInterval(() => {
      if (displayIndexRef.current < fullTextRef.current.length) {
        displayIndexRef.current++
        setDisplayText(fullTextRef.current.slice(0, displayIndexRef.current))
      } else if (!loadingRef.current) {
        // 输出完成且不再加载
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setAnimating(false)
      }
    }, CHAR_INTERVAL)
  }, [])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  /* ------------------------------------------------------------
     开始解读
     ------------------------------------------------------------ */

  const handleInterpret = useCallback(async () => {
    if (!chart || !birthInfo) return

    // 重置状态
    loadingRef.current = true
    setLoading(true)
    setError(null)
    setDisplayText('')
    fullTextRef.current = ''
    displayIndexRef.current = 0

    // 清理旧定时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      // 提取知识上下文
      const knowledge = extractKnowledge(chart, birthInfo?.year || 1990)
      const contextStr = buildPromptContext(knowledge)

      // 构建用户消息
      const currentYear = new Date().getFullYear()
      const userMessage = `请解读以下命盘：

## 基本信息
- 阳历：${birthInfo?.year || 1990}年${birthInfo?.month || 1}月${birthInfo?.day || 1}日
- 性别：${birthInfo?.gender === 'male' ? '男' : '女'}
- 五行局：${chart?.fiveElementsClass || '未知'}
- 当前年份：${currentYear}年

${contextStr}

请结合当前年份${currentYear}年，给出详细但通俗易懂的命盘解读，确保所有年份相关的分析都基于${currentYear}年。`

      const messages: ChatMessage[] = [
        { role: 'system', content: getChartSystemPrompt() },
        { role: 'user', content: userMessage },
      ]

      // 启动均匀输出动画
      startAnimation()

      // 流式接收，写入缓冲区
      for await (const token of streamChat(llmConfig, messages)) {
        fullTextRef.current += token
      }

      // 保存到全局缓存
      setChartInterpretation(fullTextRef.current)
      
      // 保存到对话历史
      setChartChatHistory([
        { role: 'system', content: getChartSystemPrompt() },
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullTextRef.current },
      ])

      // 保存到服务器历史记录
      try {
        await fetch(`${config.apiBaseUrl}/api/user/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ziwei-token')}`,
          },
          body: JSON.stringify({
            type: 'chart',
            title: `命盘解读 - ${birthInfo?.year || 1990}年${birthInfo?.month || 1}月${birthInfo?.day || 1}日`,
            content: fullTextRef.current,
            birth_info: birthInfo,
          }),
        })
      } catch {}
    } catch (err) {
      console.error('解读错误:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null) {
        setError(JSON.stringify(err))
      } else {
        setError('解读失败，请重试')
      }
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [chart, birthInfo, llmConfig, startAnimation, setChartInterpretation, setChartChatHistory])

  if (!chart) return null

  return (
    <div
      className="
        relative p-6 lg:p-8
        bg-gradient-to-br from-white/[0.04] to-transparent
        backdrop-blur-xl border border-white/[0.08] rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      "
    >
      {/* 顶部发光线 */}
      <div
        className="
          absolute top-0 left-1/2 -translate-x-1/2
          w-1/3 h-px
          bg-gradient-to-r from-transparent via-gold/50 to-transparent
        "
      />

      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="
            text-xl lg:text-2xl font-semibold
            bg-gradient-to-r from-gold via-gold-light to-gold
            bg-clip-text text-transparent
          "
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          命盘解读
        </h2>
        <Button
          onClick={() => requireAuth(handleInterpret)}
          disabled={loading}
          size="sm"
          variant="gold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
              解读中
            </span>
          ) : chartInterpretation ? '重新解读' : '开始解读'}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm mb-4 border border-misfortune/20">
          {error}
        </div>
      )}

      {/* 加载中提示 */}
      {!displayText && (
        <div className="text-text-muted text-sm py-8 text-center">
          <div className="text-3xl mb-3 opacity-30">☆</div>
          点击「开始解读」按钮，获取深度命盘分析。
        </div>
      )}

      {/* 解读内容 - 书法字体 + Markdown 渲染 */}
      {displayText && (
        <div
          ref={contentRef}
          className="
            prose prose-invert max-w-none
            text-text-secondary text-lg lg:text-xl leading-loose
          "
          style={{ fontFamily: 'var(--font-brush)' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {displayText}
          </ReactMarkdown>

          {/* 光标指示器 */}
          {animating && (
            <span className="inline-block w-0.5 h-5 bg-gold/80 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      )}

      {/* 加载占位 */}
      {loading && !displayText && (
        <div className="flex items-center justify-center gap-3 text-text-muted py-12">
          <div className="w-5 h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
          <span>正在分析命盘...</span>
        </div>
      )}

      {/* 追问功能 */}
      {chartInterpretation && (
        <FollowUpQuestion
          systemPrompt={getChartSystemPrompt()}
          chatHistory={chartChatHistory}
          onChatHistoryChange={setChartChatHistory}
          llmConfig={llmConfig}
          placeholder="基于以上命盘解读，有什么问题想问吗？"
        />
      )}
    </div>
  )
}
