/* ============================================================
   紫微斗数 App - 主入口
   水墨玄紫设计 + 八卦盘装饰
   ============================================================ */

import { useState, useEffect, lazy, Suspense } from 'react'
import { BirthForm } from '@/components/BirthForm'
import { ChartDisplay } from '@/components/chart'
import { ChartInterpretation } from '@/components/ChartInterpretation'
import { useChartStore, useAuthStore, usePointsConfigStore } from '@/stores'
import logoSvg from '@/assets/zwdsLogo.png'
import { InkBackground, BaguaDecoration, InkTextTitle, InkDivider } from '@/components/InkDecorations'

const YearlyFortune = lazy(() => import('@/components/fortune/YearlyFortune').then(m => ({ default: m.YearlyFortune })))
const LifeKLine = lazy(() => import('@/components/kline/LifeKLine').then(m => ({ default: m.LifeKLine })))
const MatchAnalysis = lazy(() => import('@/components/match/MatchAnalysis').then(m => ({ default: m.MatchAnalysis })))
const ShareCard = lazy(() => import('@/components/share/ShareCard').then(m => ({ default: m.ShareCard })))
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })))
const PersonalCenter = lazy(() => import('@/components/personal/PersonalCenter').then(m => ({ default: m.PersonalCenter })))

// 全局滚动条样式
const globalScrollbarStyles = `
  /* 全局滚动条美化 - 水墨玄紫风格 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.3), rgba(251, 191, 36, 0.2));
    border-radius: 4px;
    border: 1px solid rgba(251, 191, 36, 0.1);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.5), rgba(251, 191, 36, 0.4));
  }
  
  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
  }
`

type TabType = 'chart' | 'fortune' | 'kline' | 'match' | 'share'

const TABS: Array<{ key: TabType; label: string; icon: string }> = [
  { key: 'chart', label: '命盘解读', icon: '☰' },
  { key: 'fortune', label: '年度运势', icon: '◎' },
  { key: 'kline', label: '人生K线', icon: '⊹' },
  { key: 'match', label: '双人合盘', icon: '⚭' },
  { key: 'share', label: '分享卡片', icon: '◈' },
]

export default function App() {
  const { chart } = useChartStore()
  const { isLoggedIn, user, setShowAuthModal, refreshUser } = useAuthStore()
  const { load: loadPointsConfig } = usePointsConfigStore()
  const [showPersonalCenter, setShowPersonalCenter] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('chart')

  useEffect(() => {
    const token = localStorage.getItem('ziwei-token')
    if (token) {
      refreshUser()
    }
    loadPointsConfig()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 全局滚动条样式 */}
      <style>{globalScrollbarStyles}</style>
      {/* 水墨玄紫背景 */}
      <InkBackground />

      {/* 头部 - 水墨玄紫毛玻璃导航 */}
      <header
        className="
          sticky top-0 z-40
          py-4 px-6 lg:px-12
          bg-night/70 backdrop-blur-md
          border-b border-gold/20
        "
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Logo + 导航 */}
          <div className="flex items-center gap-10">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {/* Logo 图标 */}
              <img src={logoSvg} alt="紫微卜运 Logo" className="w-12 h-12" />
              {/* Logo 文字 */}
              <div>
                <InkTextTitle className="text-2xl">
                  紫微卜运
                </InkTextTitle>
                <p className="text-text-muted text-sm hidden sm:block" style={{ fontFamily: 'var(--font-brush)' }}>
                  命理工具
                </p>
              </div>
            </div>

            {/* 桌面端导航 - 水墨风格 */}
            <nav className="hidden md:flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    group relative px-5 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-300
                    ink-ripple-click
                    ${activeTab === tab.key
                      ? 'text-text'
                      : 'text-text-muted hover:text-text-secondary'
                    }
                  `}
                >
                  {/* 背景 */}
                  <span
                    className={`
                      absolute inset-0 rounded-xl transition-all duration-300
                      ${activeTab === tab.key
                        ? 'bg-gradient-to-r from-purple-600/20 to-amber-400/10 border border-gold/30'
                        : 'group-hover:bg-purple-500/10'
                      }
                    `}
                  />
                  {/* 内容 */}
                  <span className="relative flex items-center gap-2">
                    <span className={`
                      text-base transition-all duration-300
                      ${activeTab === tab.key ? 'text-gold scale-110' : 'opacity-60 group-hover:opacity-100'}
                    `}>
                      {tab.icon}
                    </span>
                    <span style={{ fontFamily: 'var(--font-brush)' }}>{tab.label}</span>
                  </span>
                  {/* 下划线指示器 - 水墨风格 */}
                  <span
                    className={`
                      absolute -bottom-1 left-1/2 -translate-x-1/2
                      h-1 rounded-full
                      bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400
                      shadow-[0_0_10px_rgba(251,191,36,0.4)]
                      transition-all duration-500
                      ${activeTab === tab.key ? 'w-3/4 opacity-100' : 'w-0 opacity-0'}
                    `}
                  />
                </button>
              ))}
            </nav>
          </div>

          {/* 个人中心 / 登录 */}
          {isLoggedIn ? (
            <button
              onClick={() => setShowPersonalCenter(true)}
              className="
                group relative px-4 py-2 rounded-xl
                bg-purple-900/20 border border-gold/20
                hover:bg-purple-900/30 hover:border-gold/40
                transition-all duration-300
                flex items-center gap-2.5
                ink-ripple-click
              "
              title="个人中心"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-star/40 to-gold/20 border border-gold/30 flex items-center justify-center text-sm overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gold/60">🧑</span>
                )}
              </span>
              <span className="text-sm text-text-secondary group-hover:text-gold transition-colors hidden sm:inline" style={{ fontFamily: 'var(--font-brush)' }}>
                {user?.display_name || user?.username}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="
                group relative px-5 py-2.5 rounded-xl
                bg-gradient-to-r from-gold to-gold-dark
                text-night font-semibold
                shadow-[0_4px_20px_rgba(212,175,55,0.3)]
                hover:shadow-[0_6px_28px_rgba(212,175,55,0.4)]
                transition-all duration-300
                ink-ripple-click
              "
              style={{ fontFamily: 'var(--font-brush)' }}
            >
              登录
            </button>
          )}
        </div>
      </header>

      {/* 移动端底部导航 - 水墨风格 */}
      <nav
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-40
          px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]
          bg-night/85 backdrop-blur-md
          border-t border-gold/20
        "
      >
        <div className="flex justify-around max-w-lg mx-auto w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg
                transition-all duration-300
                ink-ripple-click relative flex-1 min-w-0
                ${activeTab === tab.key
                  ? 'text-gold'
                  : 'text-text-muted hover:text-text-secondary'
                }
              `}
            >
              {/* 选中背景 */}
              {activeTab === tab.key && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-t from-purple-600/20 to-transparent border border-gold/20" />
              )}
              <span className="relative text-xl leading-none">{tab.icon}</span>
              <span className="relative text-[10px] leading-tight truncate w-full text-center" style={{ fontFamily: 'var(--font-brush)' }}>{tab.label}</span>
              {/* 选中指示点 */}
              {activeTab === tab.key && (
                <span className="absolute -top-0.5 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 主内容 - 水墨玄紫风格 */}
      <main className="flex-1 px-4 lg:px-12 py-8 pb-24 md:pb-8 relative">
        {/* 装饰性八卦盘 - 背景 */}
        <div className="absolute right-12 top-12 opacity-20 pointer-events-none hidden lg:block">
          <BaguaDecoration size={180} rotate={true} />
        </div>
        <div className="absolute left-8 bottom-24 opacity-15 pointer-events-none hidden lg:block">
          <BaguaDecoration size={120} rotate={true} />
        </div>

        <div className="max-w-[1600px] mx-auto relative z-10">
          {/* 命盘解读标签 */}
          {activeTab === 'chart' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-2">
                <BirthForm />
              </div>
            ) : (
              <div className="animate-fade-in space-y-4">
                {/* 命盘 */}
                <div className="w-full">
                  <ChartDisplay />
                </div>

                {/* 解读 */}
                <div className="w-full max-w-6xl mx-auto">
                  <ChartInterpretation />
                </div>

                {/* 重新排盘按钮 - 水墨风格 */}
                <div className="text-center">
                  <button
                    onClick={() => useChartStore.getState().clear()}
                    className="
                      inline-flex items-center gap-2 px-6 py-3 rounded-xl
                      text-base text-text-muted
                      hover:text-gold hover:bg-purple-900/20
                      border border-gold/10 hover:border-gold/30
                      transition-all duration-300
                      ink-ripple-click
                    "
                    style={{ fontFamily: 'var(--font-brush)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    重新输入命盘
                  </button>
                </div>
              </div>
            )
          )}

          {/* 年度运势标签 */}
          {activeTab === 'fortune' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState message="请先在「命盘解读」中输入您的生辰信息" action={() => setActiveTab('chart')} actionLabel="前往输入" />
              </div>
            ) : (
              <Suspense fallback={<LoadingPlaceholder />}><YearlyFortune /></Suspense>
            )
          )}

          {/* 人生K线标签 */}
          {activeTab === 'kline' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState message="请先在「命盘解读」中输入您的生辰信息" action={() => setActiveTab('chart')} actionLabel="前往输入" />
              </div>
            ) : (
              <Suspense fallback={<LoadingPlaceholder />}><LifeKLine /></Suspense>
            )
          )}

          {/* 双人合盘标签 */}
          {activeTab === 'match' && <Suspense fallback={<LoadingPlaceholder />}><MatchAnalysis /></Suspense>}

          {/* 分享卡片标签 */}
          {activeTab === 'share' && (
            !chart ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptyState message="请先在「命盘解读」中输入您的生辰信息" action={() => setActiveTab('chart')} actionLabel="前往输入" />
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                <Suspense fallback={<LoadingPlaceholder />}><ShareCard /></Suspense>
              </div>
            )
          )}
        </div>
      </main>

      {/* 登录/注册弹窗 */}
      <AuthModal />

      {/* 个人中心弹窗 */}
      {showPersonalCenter && (
        <PersonalCenter onClose={() => setShowPersonalCenter(false)} />
      )}

      {/* 底部 - 仅桌面端显示 */}
      <footer
        className="
          hidden md:block
          py-6 text-center text-text-muted text-sm
          border-t border-white/[0.04]
        "
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-purple-400/60 text-lg">☯</span>
          <p className="flex items-center gap-2" style={{ fontFamily: 'var(--font-brush)' }}>
            <span className="text-gold/60">☆</span>
            观星知势 · 谋定而行
            <span className="text-purple-400/60">☆</span>
          </p>
          <span className="text-gold/60 text-lg">☯</span>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------
   空状态组件
   ------------------------------------------------------------ */

function LoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <span className="text-6xl mb-4 animate-pulse-soft opacity-50">☯</span>
        <p className="text-text-muted" style={{ fontFamily: 'var(--font-brush)' }}>加载中...</p>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  message: string
  action: () => void
  actionLabel: string
}

function EmptyState({ message, action, actionLabel }: EmptyStateProps) {
  return (
    <div
      className="
        text-center p-10 rounded-2xl
        ink-wash-card glass
        max-w-md mx-auto
      "
    >
      <div className="text-6xl mb-6 opacity-50 animate-pulse-soft">☯</div>
      <p className="text-text-muted mb-6 text-base" style={{ fontFamily: 'var(--font-brush)' }}>{message}</p>
      <button
        onClick={action}
        className="
          inline-flex items-center gap-2
          px-6 py-3 rounded-xl
          bg-gradient-to-r from-purple-600/30 to-amber-400/20
          text-gold border border-gold/30
          hover:from-purple-600/40 hover:to-amber-400/30
          hover:border-gold/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]
          transition-all duration-300
          ink-ripple-click
        "
        style={{ fontFamily: 'var(--font-brush)' }}
      >
        {actionLabel}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  )
}
