import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores'
import { api } from '@/api'

interface RechargePackage {
  amount: number
  points: number
  label: string
  bonus?: number
  limited?: boolean
  original_price?: number
}

interface RechargeConfig {
  wechatQR: string
  alipayQR: string
  packages: RechargePackage[]
}

export function RechargePage({ onClose }: { onClose: () => void }) {
  const { user, refreshUser } = useAuthStore()
  const [config, setConfig] = useState<RechargeConfig | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [voucherNote, setVoucherNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [currentOrderNo, setCurrentOrderNo] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadConfig()
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  const loadConfig = async () => {
    try {
      const data = await api.recharge.getConfig()
      setConfig(data)
    } catch {
      setErrorMsg('加载充值配置失败')
    }
  }

  // 轮询订单状态
  const startPolling = (orderNo: string) => {
    setCurrentOrderNo(orderNo)
    setOrderStatus('pending')
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('ziwei-token')
        const res = await fetch(`/api/recharge/order/${orderNo}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        
        if (!res.ok) return
        
        const data = await res.json()
        setOrderStatus(data.order.status)
        
        if (data.order.status === 'approved') {
          // 充值成功
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          setSuccessMsg(`充值成功！获得 ${data.order.points} 积分`)
          refreshUser()
          
          // 3秒后关闭
          setTimeout(() => {
            onClose()
          }, 3000)
        } else if (data.order.status === 'rejected') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          setErrorMsg('充值申请被拒绝，请联系管理员')
        }
      } catch {
        // 忽略轮询错误
      }
    }, 3000) // 每3秒轮询一次
  }

  const handleSubmit = async () => {
    if (!selectedPackage) {
      setErrorMsg('请选择充值套餐')
      return
    }

    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const result = await api.recharge.apply({
        amount: selectedPackage.amount,
        points: selectedPackage.points,
        payment_method: paymentMethod,
        voucher_note: voucherNote,
      })
      
      // 开始轮询订单状态
      if (result.order?.order_no) {
        startPolling(result.order.order_no)
      }
      
      setSelectedPackage(null)
      setVoucherNote('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const qrCode = paymentMethod === 'wechat' ? config?.wechatQR : config?.alipayQR
  const qrLabel = paymentMethod === 'wechat' ? 'Claybur' : '支付宝'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="
        relative w-full max-w-lg max-h-[90vh] overflow-y-auto
        bg-gradient-to-br from-[#121228] to-[#0a0a15]
        backdrop-blur-xl border border-gold/20 rounded-2xl
        shadow-[0_8px_40px_rgba(0,0,0,0.5)]
      ">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gold" style={{ fontFamily: 'var(--font-serif)' }}>
              充值积分
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-gold transition-colors text-xl">
              ✕
            </button>
          </div>

          {successMsg && (
            <div className="p-4 mb-4 rounded-xl bg-fortune/10 border border-fortune/30">
              <p className="text-fortune text-sm">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 mb-4 rounded-xl bg-misfortune/10 border border-misfortune/30">
              <p className="text-misfortune text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-gradient-to-r from-star/10 to-gold/5 border border-gold/10 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">当前积分</span>
              <span className="text-2xl font-bold text-gold">{user?.points ?? 0}</span>
            </div>
          </div>

          {/* 订单状态提示 */}
          {currentOrderNo && orderStatus === 'pending' && (
            <div className="p-4 mb-4 rounded-xl bg-star/10 border border-star/30">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-star border-t-transparent rounded-full animate-spin" />
                <p className="text-star text-sm">等待支付中...</p>
              </div>
              <p className="text-text-muted text-xs mt-1">订单号：{currentOrderNo}</p>
              <p className="text-text-muted text-xs mt-1">支付完成后将自动充值</p>
            </div>
          )}

          {!currentOrderNo && (
            <>
              <div className="mb-6">
                <p className="text-text-secondary text-sm mb-3">选择充值套餐</p>
                <div className="grid grid-cols-2 gap-3">
                  {config?.packages.map((pkg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`
                        p-4 rounded-xl border transition-all text-left relative
                        ${selectedPackage?.amount === pkg.amount
                          ? 'border-gold bg-gold/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-gold/30'
                        }
                      `}
                    >
                      {pkg.original_price && (
                        <div className="absolute top-2 right-2 text-xs text-text-muted/50 line-through">
                          ¥{pkg.original_price}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-gold">¥{pkg.amount}</span>
                        {pkg.limited && (
                          <span className="px-2 py-0.5 rounded text-xs bg-misfortune/20 text-misfortune">
                            限时
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs">{pkg.label}</p>
                      <p className="text-text text-sm mt-1">
                        {pkg.points} 积分
                        {pkg.bonus && (
                          <span className="text-fortune text-xs ml-1">
                            （含赠送 {pkg.bonus} 积分）
                          </span>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPackage && (
                <>
                  <div className="mb-6">
                    <p className="text-text-secondary text-sm mb-3">选择支付方式</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPaymentMethod('wechat')}
                        className={`
                          flex-1 py-3 rounded-xl border transition-all text-sm
                          ${paymentMethod === 'wechat'
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-green-500/30'
                          }
                        `}
                      >
                        Claybur
                      </button>
                      <button
                        onClick={() => setPaymentMethod('alipay')}
                        className={`
                          flex-1 py-3 rounded-xl border transition-all text-sm
                          ${paymentMethod === 'alipay'
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-blue-500/30'
                          }
                        `}
                      >
                        支付宝
                      </button>
                    </div>
                  </div>

                  {qrCode ? (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                      <p className="text-text-secondary text-sm mb-3">
                        请添加管理员 Claybur 充值：TianHong-04
                      </p>
                      <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2 mb-3">
                        <img src={qrCode} alt={`${qrLabel}收款码`} className="w-full h-full object-contain" />
                      </div>
                      <p className="text-text-muted text-xs">
                        添加后请备注您的用户 ID: {user?.id}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-text-muted text-sm text-center">
                        请添加管理员 Claybur 充值：TianHong-04
                      </p>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-text-secondary text-sm mb-3">付款备注（选填）</p>
                    <input
                      type="text"
                      value={voucherNote}
                      onChange={(e) => setVoucherNote(e.target.value)}
                      placeholder="请输入付款时的备注信息"
                      className="
                        w-full px-4 py-3 rounded-xl text-sm
                        bg-white/[0.04] border border-white/[0.08]
                        text-text placeholder-text-muted
                        focus:outline-none focus:border-star/50
                      "
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="
                      w-full py-3 rounded-xl text-sm font-medium
                      bg-gradient-to-r from-star to-star-dark
                      text-white
                      hover:from-star-light hover:to-star
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {submitting ? '提交中...' : '我已添加，提交申请'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
