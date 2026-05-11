import { useState, useEffect, useRef } from 'react'
import { useAuthStore, usePointsConfigStore } from '@/stores'
import { api, type PointsLogEntry } from '@/api'
import { RechargeHistory } from './RechargeHistory'
import { HistoryPage } from './HistoryPage'

export function PersonalCenter({ onClose }: { onClose: () => void }) {
  const { user, logout, refreshUser } = useAuthStore()
  const { configs, load: loadConfigs } = usePointsConfigStore()
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemError, setRedeemError] = useState(false)
  const [pointsLog, setPointsLog] = useState<PointsLogEntry[]>([])
  const [showLog, setShowLog] = useState(false)
  const [showRechargeHistory, setShowRechargeHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRechargeNotice, setShowRechargeNotice] = useState(false)
  const [invitePoints, setInvitePoints] = useState(500)

  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '')
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [savingDisplayName, setSavingDisplayName] = useState(false)
  const [displayNameMsg, setDisplayNameMsg] = useState('')

  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConfigs()
    refreshUser()
    fetch('/api/points-config').then(r => r.json()).then(d => setInvitePoints(d.invitePoints || 500)).catch(() => {})
  }, [])

  useEffect(() => {
    setDisplayName(user?.display_name || user?.username || '')
    setAvatarUrl(user?.avatar_url || '')
  }, [user])

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true)
    setRedeemMsg('')
    setRedeemError(false)
    try {
      const res = await api.redeem.use(redeemCode.trim())
      setRedeemMsg(`成功兑换 ${res.points_added} 积分！当前积分：${res.current_points}`)
      setRedeemCode('')
      refreshUser()
    } catch (err) {
      setRedeemMsg(err instanceof Error ? err.message : '兑换失败')
      setRedeemError(true)
    } finally {
      setRedeeming(false)
    }
  }

  const loadLog = async () => {
    if (pointsLog.length > 0) { setShowLog(!showLog); return }
    try {
      const res = await api.user.pointsLog(30)
      setPointsLog(res.logs)
      setShowLog(true)
    } catch {}
  }

  const handleSaveDisplayName = async () => {
    if (displayName.trim() === user?.display_name) { setEditingDisplayName(false); return }
    setSavingDisplayName(true)
    setDisplayNameMsg('')
    try {
      await api.user.update({ display_name: displayName.trim() })
      refreshUser()
      setEditingDisplayName(false)
    } catch (err) {
      setDisplayNameMsg(err instanceof Error ? err.message : '修改失败')
    } finally {
      setSavingDisplayName(false)
    }
  }

  const handleAvatarSave = async (base64Url?: string) => {
    const url = base64Url || avatarUrl
    if (!url.trim()) return
    setSavingAvatar(true)
    try {
      await api.user.update({ avatar_url: url })
      refreshUser()
    } catch {}
    setSavingAvatar(false)
  }

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('图片不能超过 2MB')
      return
    }
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await handleAvatarSave(base64)
    } catch {
      alert('上传失败')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="
        relative w-full max-w-lg max-h-[90vh] overflow-y-auto
        bg-gradient-to-br from-[#121228] to-[#0a0a15]
        backdrop-blur-xl border border-gold/20 rounded-2xl
        shadow-[0_8px_40px_rgba(0,0,0,0.5)]
        animate-fade-in
      ">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gold" style={{ fontFamily: 'var(--font-serif)' }}>
              个人中心
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-gold transition-colors text-xl">
              ✕
            </button>
          </div>

          {/* 头像 + 信息 */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-star/30 to-gold/20 border border-gold/30 flex items-center justify-center text-4xl mb-3 cursor-pointer hover:opacity-80 transition-opacity relative overflow-hidden"
              onClick={() => fileRef.current?.click()}
              title="点击更换头像"
            >
              {uploading ? (
                <span className="w-6 h-6 border-2 border-gold/50 border-t-transparent rounded-full animate-spin" />
              ) : user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gold/60">🧑</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleAvatarUpload(f)
                }}
              />
            </div>

            {/* 用户名 */}
            <div className="flex items-center gap-2 mb-1">
              {editingDisplayName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDisplayName(); if (e.key === 'Escape') { setEditingDisplayName(false); setDisplayName(user?.display_name || user?.username || '') } }}
                    className="
                      w-28 px-2 py-1 rounded-lg text-sm text-center
                      bg-white/[0.04] border border-star/40
                      text-text focus:outline-none focus:border-star
                    "
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={savingDisplayName}
                    className="text-xs px-2 py-1 rounded bg-star/20 text-star-light hover:bg-star/30 transition-all disabled:opacity-50"
                  >
                    {savingDisplayName ? '...' : '确认'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-text text-lg font-medium" style={{ fontFamily: 'var(--font-brush)' }}>
                    {user?.display_name || user?.username}
                  </p>
                  <button
                    onClick={() => setEditingDisplayName(true)}
                    className="text-text-muted/40 hover:text-star-light transition-colors text-xs"
                    title="修改昵称"
                  >
                    编辑
                  </button>
                </div>
              )}
            </div>
            {displayNameMsg && (
              <p className="text-xs text-misfortune mb-1">{displayNameMsg}</p>
            )}
            <p className="text-text-muted/60 text-xs">ID: {user?.id}</p>
            <p className="text-text-muted text-sm mt-0.5">
              注册时间：{user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : ''}
            </p>

            {/* 邀请码 */}
            {user?.invite_code && (
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/20 w-full max-w-xs">
                <p className="text-text-muted text-xs mb-1">我的邀请码</p>
                <div className="flex items-center justify-between">
                  <span className="text-gold font-mono text-lg tracking-widest">{user.invite_code}</span>
                  <button
                    onClick={() => {
                      if (user.invite_code) {
                        navigator.clipboard?.writeText(user.invite_code)
                        alert('邀请码已复制')
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-gold/20 text-gold hover:bg-gold/30 transition-all"
                  >
                    复制
                  </button>
                </div>
                <p className="text-text-muted/60 text-xs mt-1">邀请用户可得 {invitePoints} 积分</p>
              </div>
            )}

            {/* 头像 URL 输入 (暂时隐藏) */}
            {/* <div className="flex items-center gap-2 mt-3 w-full max-w-xs">
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="或输入头像图片 URL"
                className="
                  flex-1 px-3 py-2 rounded-lg text-sm
                  bg-white/[0.04] border border-white/[0.08]
                  text-text placeholder-text-muted
                  focus:outline-none focus:border-star/50
                "
                onKeyDown={(e) => e.key === 'Enter' && handleAvatarSave()}
              />
              <button
                onClick={() => handleAvatarSave()}
                disabled={savingAvatar || !avatarUrl.trim()}
                className="px-3 py-2 rounded-lg text-sm bg-star/20 border border-star/30 text-star-light hover:bg-star/30 transition-all disabled:opacity-50"
              >
                {savingAvatar ? '...' : '保存'}
              </button>
            </div> */}
          </div>

          {/* 积分展示 */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-star/10 to-gold/5 border border-gold/10 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-secondary text-sm">当前积分</span>
              <span className="text-2xl font-bold text-gold">{user?.points ?? 0}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowRechargeNotice(true)}
                className="
                  flex flex-col items-center justify-center gap-1
                  py-3 px-2 rounded-xl
                  bg-gradient-to-br from-gold/20 to-gold/5
                  border border-gold/30
                  text-gold text-xs font-medium
                  hover:from-gold/30 hover:to-gold/10
                  active:scale-95
                  transition-all duration-200
                "
              >
                <span>充值积分</span>
              </button>
              <button
                onClick={() => setShowRechargeHistory(true)}
                className="
                  flex flex-col items-center justify-center gap-1
                  py-3 px-2 rounded-xl
                  bg-gradient-to-br from-white/10 to-white/5
                  border border-white/20
                  text-text-secondary text-xs font-medium
                  hover:from-white/15 hover:to-white/8
                  active:scale-95
                  transition-all duration-200
                "
              >
                <span>充值记录</span>
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="
                  flex flex-col items-center justify-center gap-1
                  py-3 px-2 rounded-xl
                  bg-gradient-to-br from-white/10 to-white/5
                  border border-white/20
                  text-text-secondary text-xs font-medium
                  hover:from-white/15 hover:to-white/8
                  active:scale-95
                  transition-all duration-200
                "
              >
                <span>历史记录</span>
              </button>
              <button
                onClick={loadLog}
                className="
                  flex flex-col items-center justify-center gap-1
                  py-3 px-2 rounded-xl
                  bg-gradient-to-br from-white/10 to-white/5
                  border border-white/20
                  text-text-secondary text-xs font-medium
                  hover:from-white/15 hover:to-white/8
                  active:scale-95
                  transition-all duration-200
                "
              >
                <span>{showLog ? '收起' : '积分流水'}</span>
              </button>
            </div>

            {showLog && (
              <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setShowLog(false)}>
                <div className="
                  relative w-full max-w-md max-h-[70vh]
                  bg-gradient-to-br from-[#121228] to-[#0a0a15]
                  backdrop-blur-xl border border-gold/20 rounded-2xl
                  shadow-[0_8px_40px_rgba(0,0,0,0.5)]
                  animate-fade-in overflow-hidden flex flex-col
                ">
                  <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <h3 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-serif)' }}>
                      积分流水
                    </h3>
                    <button onClick={() => setShowLog(false)} className="text-text-muted hover:text-gold transition-colors text-xl">
                      ✕
                    </button>
                  </div>
                  <div className="p-5 space-y-2 overflow-y-auto flex-1">
                    {pointsLog.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm py-2.5 border-b border-white/[0.04]">
                        <span className={log.amount > 0 ? 'text-fortune font-medium' : 'text-misfortune font-medium'}>
                          {log.amount > 0 ? '+' : ''}{log.amount} 积分
                        </span>
                        <span className="text-text-secondary text-xs">{log.description}</span>
                        <span className="text-text-muted/50 text-xs whitespace-nowrap ml-2">{log.created_at?.slice(5, 16)}</span>
                      </div>
                    ))}
                    {pointsLog.length === 0 && (
                      <p className="text-center text-text-muted py-8">暂无记录</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 兑换码 */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
            <p className="text-text-secondary text-sm mb-3">兑换码</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="输入兑换码"
                className="
                  flex-1 px-4 py-2.5 rounded-xl text-sm
                  bg-white/[0.04] border border-white/[0.08]
                  text-text placeholder-text-muted
                  focus:outline-none focus:border-star/50
                  uppercase
                "
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={redeeming || !redeemCode.trim()}
                className="
                  px-5 py-2.5 rounded-xl
                  bg-gradient-to-r from-star to-star-dark
                  text-white text-sm font-medium
                  hover:from-star-light hover:to-star
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {redeeming ? '...' : '兑换'}
              </button>
            </div>
            {redeemMsg && (
              <p className={`text-xs mt-2 ${redeemError ? 'text-misfortune' : 'text-fortune'}`}>
                {redeemMsg}
              </p>
            )}
          </div>

          {/* 消耗参考 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-6">
            <p className="text-text-muted text-xs mb-2">各操作消耗积分参考：</p>
            <div className="space-y-1.5">
              {configs.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{c.name}</span>
                  <span className="text-gold/80">{c.cost} 积分/次</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { logout(); onClose() }}
            className="
              w-full py-3 rounded-xl text-sm
              bg-white/[0.04] border border-white/[0.08]
              text-text-muted hover:text-misfortune hover:border-misfortune/30
              transition-all duration-200
            "
            style={{ fontFamily: 'var(--font-brush)' }}
          >
            退出登录
          </button>
        </div>
      </div>

      {showRechargeNotice && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowRechargeNotice(false)}>
          <div className="
            relative w-full max-w-sm
            bg-gradient-to-br from-[#121228] to-[#0a0a15]
            backdrop-blur-xl border border-gold/20 rounded-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.5)]
            animate-fade-in
          ">
            <div className="p-6 text-center">
              <h3 className="text-xl font-semibold text-gold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                充值功能暂未开放
              </h3>
              <p className="text-text-secondary text-sm mb-2">
                如需充值，请联系管理员
              </p>
              <p className="text-gold text-lg font-medium mb-6">
                微信：TianHong-04
              </p>
              <button
                onClick={() => setShowRechargeNotice(false)}
                className="
                  w-full py-3 rounded-xl text-sm font-medium
                  bg-gradient-to-r from-gold to-gold-dark
                  text-[#121228]
                  hover:from-gold-light hover:to-gold
                  transition-all duration-200
                "
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {showRechargeHistory && (
        <RechargeHistory onClose={() => setShowRechargeHistory(false)} />
      )}

      {showHistory && (
        <HistoryPage onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
