import { useState, useEffect, useCallback } from 'react'
import { config } from '@/config/environment'

interface CaptchaProps {
  onVerify: (valid: boolean, token: string, code: string) => void
}

interface MathCaptcha {
  token: string
  question: string
  answer: number
}

export function Captcha({ onVerify }: CaptchaProps) {
  const [captchaToken, setCaptchaToken] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(0)
  const [inputValue, setInputValue] = useState('')

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/captcha/generate`)
      const data = await res.json()
      
      if (data.token && data.question !== undefined && data.answer !== undefined) {
        setCaptchaToken(data.token)
        setQuestion(data.question)
        setAnswer(data.answer)
        setInputValue('')
        onVerify(false, '', '')
      } else {
        generateLocalCaptcha()
      }
    } catch {
      generateLocalCaptcha()
    }
  }, [])

  const generateLocalCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    const operators = ['+', '-']
    const operator = operators[Math.floor(Math.random() * operators.length)]
    
    let questionText: string
    let correctAnswer: number
    
    if (operator === '+') {
      questionText = `${num1} + ${num2} = ?`
      correctAnswer = num1 + num2
    } else {
      questionText = `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`
      correctAnswer = Math.max(num1, num2) - Math.min(num1, num2)
    }
    
    setQuestion(questionText)
    setAnswer(correctAnswer)
    setCaptchaToken(`local_${Date.now()}_${correctAnswer}`)
    setInputValue('')
    onVerify(false, '', '')
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
    setInputValue(val)
    
    if (val && captchaToken) {
      const userAnswer = parseInt(val, 10)
      if (!isNaN(userAnswer)) {
        onVerify(true, captchaToken, val)
      } else {
        onVerify(false, '', '')
      }
    } else {
      onVerify(false, '', '')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
      <div
        className="
          flex items-center justify-center px-4 py-2.5 rounded-xl cursor-pointer
          bg-gradient-to-br from-star/20 to-star/5 
          border border-star/30 text-star font-bold text-lg
          select-none min-w-[140px] h-[44px]
          hover:border-star/50 transition-all duration-200
          w-full sm:w-auto
        "
        onClick={refreshCaptcha}
        title="点击刷新验证码"
      >
        <span className="tracking-wide">{question || '加载中...'}</span>
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="输入答案"
        maxLength={3}
        inputMode="numeric"
        pattern="[0-9]*"
        className="
          flex-1 px-3 py-2.5 rounded-xl text-sm min-w-0
          bg-white/[0.04] border border-white/[0.08]
          text-text placeholder-text-muted
          focus:outline-none focus:border-star/50
          text-center font-mono tracking-widest
          transition-colors duration-200
        "
      />
    </div>
  )
}
