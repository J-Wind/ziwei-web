import { useState, useEffect } from 'react'
import { api } from '@/api'

interface RechargeOrder {
  id: number
  amount: number
  points: number
  payment_method: string
  status: string
  voucher_note: string | null
  admin_note: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
}

export function RechargeHistory({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<RechargeOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await api.recharge.history(50)
      setOrders(res.orders)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待审核', color: 'text-yellow-400' },
    approved: { label: '已通过', color: 'text-fortune' },
    rejected: { label: '已拒绝', color: 'text-misfortune' },
  }

  const paymentMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
  }

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
              充值记录
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-gold transition-colors text-xl">
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-muted">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-text-muted">暂无充值记录</div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = statusMap[order.status] || { label: order.status, color: 'text-text-muted' }
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-text-secondary text-sm">
                        ¥{order.amount} → {order.points} 积分
                      </span>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{paymentMap[order.payment_method] || order.payment_method}</span>
                      <span>{order.created_at?.slice(0, 16)}</span>
                    </div>
                    {order.voucher_note && (
                      <p className="text-xs text-text-muted mt-2">备注: {order.voucher_note}</p>
                    )}
                    {order.admin_note && (
                      <p className="text-xs text-text-muted mt-1">管理员: {order.admin_note}</p>
                    )}
                    {order.processed_at && (
                      <p className="text-xs text-text-muted mt-1">
                        处理时间: {order.processed_at.slice(0, 16)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
