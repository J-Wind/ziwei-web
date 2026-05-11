import { useState, useEffect, useRef, useCallback } from 'react'
import { config } from '@/config/environment'

interface CaptchaProps {
  onVerify: (valid: boolean, token: string) => void
}

function generateCaptchaCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function Captcha({ onVerify }: CaptchaProps) {
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [verified, setVerified] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(1, '#16213e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.strokeStyle = `rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, ${Math.random() * 200 + 55}, 0.3)`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${Math.random() * 155 + 100}, ${Math.random() * 155 + 100}, ${Math.random() * 155 + 100}, 0.5)`
      ctx.fill()
    }

    const colors = ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fde68a']
    const fonts = ['bold 28px Arial', 'bold 26px Georgia', 'bold 30px Verdana']

    for (let i = 0; i < code.length; i++) {
      ctx.save()
      ctx.font = fonts[Math.floor(Math.random() * fonts.length)]
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      ctx.translate(25 + i * 28, 30)
      ctx.rotate((Math.random() - 0.5) * 0.4)
      ctx.fillText(code[i], 0, 0)
      ctx.restore()
    }
  }, [])

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/captcha/generate`)
      const data = await res.json()
      setCaptchaToken(data.token)
      const code = data.code || generateCaptchaCode()
      setCaptchaCode(code)
      setInputValue('')
      setVerified(false)
      onVerify(false, '')
    } catch {
      const code = generateCaptchaCode()
      setCaptchaCode(code)
      setInputValue('')
      setVerified(false)
      onVerify(false, '')
    }
  }, [])

  useEffect(() => {
    refreshCaptcha()
  }, [])

  useEffect(() => {
    if (captchaCode) {
      drawCaptcha(captchaCode)
    }
  }, [captchaCode, drawCaptcha])

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase()
    setInputValue(val)
    if (val.length === 4 && captchaToken) {
      try {
        const res = await fetch(`${config.apiBaseUrl}/captcha/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: captchaToken, code: val }),
        })
        const data = await res.json()
        setVerified(data.valid)
        onVerify(data.valid, data.valid ? captchaToken : '')
      } catch {
        setVerified(false)
        onVerify(false, '')
      }
    } else {
      setVerified(false)
      onVerify(false, '')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <canvas
        ref={canvasRef}
        width={120}
        height={44}
        className="rounded-lg cursor-pointer"
        onClick={refreshCaptcha}
        title="点击刷新验证码"
      />
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="输入验证码"
        maxLength={4}
        className={`
          flex-1 px-3 py-2.5 rounded-xl text-sm
          bg-white/[0.04] border
          text-text placeholder-text-muted
          focus:outline-none
          uppercase tracking-widest text-center
          transition-colors duration-200
          ${verified ? 'border-fortune/50 bg-fortune/5' : 'border-white/[0.08] focus:border-star/50'}
        `}
      />
    </div>
  )
}
