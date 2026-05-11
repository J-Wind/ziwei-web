import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores'
import { config } from '@/config/environment'

export function AuthModal() {
  const { showAuthModal, authModalTab, setShowAuthModal, setAuthModalTab, login, register } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newUserPoints, setNewUserPoints] = useState(1000)

  // 弹窗打开时清空表单并获取注册积分配置
  useEffect(() => {
    if (showAuthModal) {
      setPhone('')
      setPassword('')
      setConfirmPassword('')
      setInviteCode('')
      setError('')
      fetchNewUserPoints()
    }
  }, [showAuthModal])

  const fetchNewUserPoints = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/points-config')
      if (res.ok) {
        const data = await res.json()
        setNewUserPoints(data.newUserPoints || 1000)
      }
    } catch {
    }
  }

  if (!showAuthModal) return null

  const isLogin = authModalTab === 'login'
  const isAdminPhone = isLogin && phone.trim() === '13888888888'

  const validatePhone = (p: string): string | null => {
    if (isLogin && p === '13888888888') return null
    if (!/^1[3-9]\d{9}$/.test(p)) {
      return '请输入正确的11位手机号'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const phoneError = validatePhone(phone.trim())
    if (phoneError) {
      setError(phoneError)
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await login(phone.trim(), password)
      } else {
        await register(phone.trim(), password, inviteCode.trim().toUpperCase() || undefined)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}
    >
      <div
        className="
          relative w-full max-w-md
          bg-gradient-to-br from-[#121228] to-[#0a0a15]
          backdrop-blur-xl border border-gold/20 rounded-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.5)]
        "
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="p-6">
          <div className="flex mb-6">
            <button
              onClick={() => { setAuthModalTab('login'); setError('') }}
              className={`flex-1 py-2.5 text-center text-base font-medium border-b-2 transition-all duration-200 ${
                isLogin ? 'border-gold text-gold' : 'border-white/10 text-text-muted hover:text-text-secondary'
              }`}
              style={{ fontFamily: 'var(--font-brush)' }}
            >
              登录
            </button>
            <button
              onClick={() => { setAuthModalTab('register'); setError('') }}
              className={`flex-1 py-2.5 text-center text-base font-medium border-b-2 transition-all duration-200 ${
                !isLogin ? 'border-gold text-gold' : 'border-white/10 text-text-muted hover:text-text-secondary'
              }`}
              style={{ fontFamily: 'var(--font-brush)' }}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  if (isAdminPhone) {
                    setPhone(e.target.value)
                  } else {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                  }
                }}
                placeholder={isLogin ? '手机号' : '手机号'}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/[0.04] backdrop-blur-sm
                  border border-white/[0.08]
                  text-text placeholder-text-muted
                  focus:outline-none focus:border-star/50 focus:bg-white/[0.06]
                  transition-all duration-200
                "
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码（至少6位）"
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/[0.04] backdrop-blur-sm
                  border border-white/[0.08]
                  text-text placeholder-text-muted
                  focus:outline-none focus:border-star/50 focus:bg-white/[0.06]
                  transition-all duration-200
                "
              />
            </div>

            {!isLogin && (
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="确认密码"
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/[0.04] backdrop-blur-sm
                    border border-white/[0.08]
                    text-text placeholder-text-muted
                    focus:outline-none focus:border-star/50 focus:bg-white/[0.06]
                    transition-all duration-200
                  "
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="邀请码（选填）"
                  maxLength={6}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/[0.04] backdrop-blur-sm
                    border border-white/[0.08]
                    text-text placeholder-text-muted
                    focus:outline-none focus:border-star/50 focus:bg-white/[0.06]
                    transition-all duration-200
                    uppercase tracking-widest
                  "
                />
              </div>
            )}

            {error && (
              <p className="text-misfortune text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 rounded-xl
                bg-gradient-to-r from-gold to-gold-dark
                text-night font-semibold
                shadow-[0_4px_20px_rgba(212,175,55,0.3)]
                hover:shadow-[0_6px_28px_rgba(212,175,55,0.4)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center justify-center gap-2
              "
              style={{ fontFamily: 'var(--font-brush)' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-night border-t-transparent rounded-full animate-spin" />
                  {isLogin ? '登录中...' : '注册中...'}
                </>
              ) : (
                isLogin ? '登 录' : '注 册'
              )}
            </button>
          </form>

          {isLogin && (
            <p className="text-text-muted text-xs text-center mt-4">
              新用户注册即送 {newUserPoints} 积分
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
