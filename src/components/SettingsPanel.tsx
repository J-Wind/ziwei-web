/* ============================================================  设置面板组件  ============================================================ */

import { useSettingsStore } from '@/stores'

/* ------------------------------------------------------------  设置面板  ------------------------------------------------------------ */

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  // 保留设置存储引用，以备将来扩展需要
  useSettingsStore()

  return (
    <div className="glass p-6 w-full max-w-md relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">设置</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 横幅提示 */}
      <div className="space-y-4">
        {/* 系统配置提示 */}
        <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-sm text-text-secondary">
          <span className="text-info">ℹ</span> 系统已配置为使用 DeepSeek 模型，所有敏感配置均在后端管理
        </div>
      </div>
    </div>
  )
}
