import { useState, useEffect } from 'react'
import { api } from '@/api'
import type { HistoryEntry } from '@/api'

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  chart: { label: '排盘解读', icon: '🔮' },
  fortune: { label: '年度运势', icon: '📅' },
  kline: { label: '人生K线', icon: '📈' },
  match: { label: '双人合盘', icon: '💑' },
}

interface HistoryPageProps {
  onClose: () => void
}

export function HistoryPage({ onClose }: HistoryPageProps) {
  const [histories, setHistories] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  useEffect(() => {
    loadHistories()
  }, [selectedType])

  const loadHistories = async () => {
    setLoading(true)
    try {
      const res = await api.user.history.list(selectedType)
      setHistories(res.histories)
    } catch (err) {
      console.error('加载历史记录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleteTargetId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setShowDeleteConfirm(false)
    setDeleting(deleteTargetId)
    try {
      await api.user.history.delete(deleteTargetId)
      if (selectedHistory?.id === deleteTargetId) {
        setSelectedHistory(null)
      }
      await loadHistories()
    } catch (err) {
      console.error('删除失败:', err)
      alert('删除失败，请重试')
    } finally {
      setDeleting(null)
      setDeleteTargetId(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteTargetId(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="text-gold font-medium">{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  const renderContent = (history: HistoryEntry) => {
    const lines = history.content.split('\n')
    return (
      <div className="space-y-3">
        {lines.map((line, i) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={i} className="text-gold font-semibold text-base mt-4 mb-2">
                {renderBoldText(line.replace('### ', ''))}
              </h4>
            )
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="text-gold font-semibold text-base mt-4 mb-2">
                {renderBoldText(line.replace('## ', ''))}
              </h3>
            )
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={i} className="text-gold font-semibold text-lg mt-4 mb-2">
                {renderBoldText(line.replace('# ', ''))}
              </h2>
            )
          }
          if (/^\s*[*-]\s+/.test(line)) {
            const content = line.replace(/^\s*[*-]\s+/, '')
            return (
              <li key={i} className="text-text-secondary text-sm ml-4 list-disc">
                {renderBoldText(content)}
              </li>
            )
          }
          if (line.trim() === '') {
            return <div key={i} className="h-2" />
          }
          return (
            <p key={i} className="text-text-secondary text-sm leading-relaxed">
              {renderBoldText(line)}
            </p>
          )
        })}
      </div>
    )
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && cancelDelete()}>
        <div className="
          relative w-full max-w-sm
          bg-gradient-to-br from-[#121228] to-[#0a0a15]
          backdrop-blur-xl border border-gold/20 rounded-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.5)]
          animate-fade-in
        ">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
              确认删除
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              删除后无法恢复，确定要删除这条记录吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="
                  flex-1 py-3 rounded-xl text-sm font-medium
                  bg-white/10 text-text-secondary
                  hover:bg-white/15
                  transition-all duration-200
                "
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting === deleteTargetId}
                className="
                  flex-1 py-3 rounded-xl text-sm font-medium
                  bg-gradient-to-r from-misfortune to-misfortune/80
                  text-white
                  hover:from-misfortune/90 hover:to-misfortune/70
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {deleting === deleteTargetId ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedHistory) {
    const typeInfo = TYPE_MAP[selectedHistory.type] || { label: selectedHistory.type, icon: '📝' }
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && setSelectedHistory(null)}>
        <div className="
          relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
          bg-gradient-to-br from-[#121228] to-[#0a0a15]
          backdrop-blur-xl border border-gold/20 rounded-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.5)]
          animate-fade-in
        ">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gold flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
                  <span>{typeInfo.icon}</span>
                  {selectedHistory.title || typeInfo.label}
                </h2>
                <p className="text-text-muted text-xs mt-1">{formatDate(selectedHistory.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(selectedHistory.id)}
                  disabled={deleting === selectedHistory.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-misfortune/20 text-misfortune hover:bg-misfortune/30 transition-all disabled:opacity-50"
                >
                  {deleting === selectedHistory.id ? '...' : '删除'}
                </button>
                <button onClick={() => setSelectedHistory(null)} className="text-text-muted hover:text-gold transition-colors text-xl">
                  ✕
                </button>
              </div>
            </div>

            {selectedHistory.birth_info && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4 text-xs text-text-muted">
                <p>出生：{selectedHistory.birth_info.year}年{selectedHistory.birth_info.month}月{selectedHistory.birth_info.day}日 {selectedHistory.birth_info.hour}时</p>
                <p>性别：{selectedHistory.birth_info.gender === 'male' ? '男' : '女'}</p>
              </div>
            )}

            <div className="prose prose-invert max-w-none">
              {renderContent(selectedHistory)}
            </div>
          </div>
        </div>
      </div>
    )
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
              历史记录
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-gold transition-colors text-xl">
              ✕
            </button>
          </div>

          {/* 类型筛选 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedType('')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                selectedType === ''
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-text-muted border border-white/10 hover:border-gold/30'
              }`}
            >
              全部
            </button>
            {Object.entries(TYPE_MAP).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  selectedType === key
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-white/5 text-text-muted border border-white/10 hover:border-gold/30'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* 历史记录列表 */}
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="w-6 h-6 border-2 border-gold/50 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : histories.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              暂无历史记录
            </div>
          ) : (
            <div className="space-y-2">
              {histories.map(h => {
                const typeInfo = TYPE_MAP[h.type] || { label: h.type, icon: '📝' }
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistory(h)}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold/30 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeInfo.icon}</span>
                        <span className="text-text text-sm font-medium">{h.title || typeInfo.label}</span>
                      </div>
                      <span className="text-text-muted text-xs">{formatDate(h.created_at)}</span>
                    </div>
                    {h.birth_info && (
                      <p className="text-text-muted/60 text-xs mt-1 ml-7">
                        {h.birth_info.year}年 · {h.birth_info.gender === 'male' ? '男' : '女'}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
