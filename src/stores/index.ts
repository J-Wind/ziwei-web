/* ============================================================
   全局状态管理
   ============================================================ */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FunctionalAstrolabe } from '@/lib/astro'
import type { BirthInfo } from '@/lib/astro'
import type { LifetimeKLinePoint } from '@/lib/fortune-score'
import type { ChatMessage } from '@/lib/llm'
import { api, type UserInfo, type PointsConfig } from '@/api'

/* ------------------------------------------------------------
   认证状态
   ------------------------------------------------------------ */

interface AuthState {
  token: string | null
  user: UserInfo | null
  isLoggedIn: boolean
  showAuthModal: boolean
  authModalTab: 'login' | 'register'
  pendingAction: (() => void) | null

  setShowAuthModal: (show: boolean, action?: () => void) => void
  setAuthModalTab: (tab: 'login' | 'register') => void
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, invite_code?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  requireAuth: (() => void) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoggedIn: false,
      showAuthModal: false,
      authModalTab: 'login',
      pendingAction: null,

      setShowAuthModal: (show, action) =>
        set({ showAuthModal: show, pendingAction: action || null }),

      setAuthModalTab: (tab) => set({ authModalTab: tab }),

      login: async (phone, password) => {
        const res = await api.auth.login(phone, password)
        localStorage.setItem('ziwei-token', res.token)
        set({ token: res.token, user: res.user, isLoggedIn: true, showAuthModal: false })
        const pending = get().pendingAction
        if (pending) {
          set({ pendingAction: null })
          setTimeout(pending, 100)
        }
      },

      register: async (phone, password, invite_code) => {
        const res = await api.auth.register(phone, password, invite_code)
        localStorage.setItem('ziwei-token', res.token)
        set({ token: res.token, user: res.user, isLoggedIn: true, showAuthModal: false })
        const pending = get().pendingAction
        if (pending) {
          set({ pendingAction: null })
          setTimeout(pending, 100)
        }
      },

      logout: () => {
        localStorage.removeItem('ziwei-token')
        set({ token: null, user: null, isLoggedIn: false })
      },

      refreshUser: async () => {
        try {
          const user = await api.user.me()
          set({ user, isLoggedIn: true })
        } catch {
          set({ token: null, user: null, isLoggedIn: false })
          localStorage.removeItem('ziwei-token')
        }
      },

      requireAuth: (action: () => void) => {
        if (get().isLoggedIn) {
          action()
          return true
        }
        set({ showAuthModal: true, pendingAction: action })
        return false
      },
    }),
    {
      name: 'ziwei-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)

/* ------------------------------------------------------------
   积分配置缓存
   ------------------------------------------------------------ */

interface PointsConfigState {
  configs: PointsConfig[]
  loaded: boolean
  load: () => Promise<void>
  getCost: (key: string) => number
}

export const usePointsConfigStore = create<PointsConfigState>()((set, get) => ({
  configs: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const configs = await api.pointsConfig()
      set({ configs, loaded: true })
    } catch {}
  },
  getCost: (key: string) => {
    const c = get().configs.find((p) => p.key === key)
    return c?.cost ?? 10
  },
}))

/* ------------------------------------------------------------
   命盘状态
   ------------------------------------------------------------ */

interface ChartState {
  birthInfo: BirthInfo | null
  chart: FunctionalAstrolabe | null
  setBirthInfo: (info: BirthInfo) => void
  setChart: (chart: FunctionalAstrolabe) => void
  clear: () => void
}

export const useChartStore = create<ChartState>()((set) => ({
  birthInfo: null,
  chart: null,
  setBirthInfo: (info) => set({ birthInfo: info }),
  setChart: (chart) => set({ chart }),
  clear: () => {
    set({ birthInfo: null, chart: null })
    // 同时清除内容缓存
    useContentCacheStore.getState().clearAll()
  },
}))

/* ------------------------------------------------------------
   内容缓存状态 (解读、K线等)
   ------------------------------------------------------------ */

interface KLineCache {
  lifetime: LifetimeKLinePoint[]  // 1-100 岁完整数据
  isGenerating: boolean           // 是否正在生成 reason
}

// 对话历史类型
type ChatHistory = ChatMessage[]

interface ContentCacheState {
  // 命盘解读
  chartInterpretation: string | null
  setChartInterpretation: (content: string) => void

  // 年度运势解读 (按年份缓存)
  yearlyFortune: Record<number, string>
  setYearlyFortune: (year: number, content: string) => void

  // K 线数据
  klineCache: KLineCache | null
  setKlineCache: (cache: KLineCache) => void
  updateKlineReasons: (reasons: { age: number; reason: string }[]) => void
  setKlineGenerating: (isGenerating: boolean) => void

  // 对话历史
  chartChatHistory: ChatHistory
  fortuneChatHistory: Record<number, ChatHistory>
  klineChatHistory: ChatHistory
  matchChatHistory: ChatHistory

  setChartChatHistory: (history: ChatHistory) => void
  setFortuneChatHistory: (year: number, history: ChatHistory) => void
  setKlineChatHistory: (history: ChatHistory) => void
  setMatchChatHistory: (history: ChatHistory) => void

  // 清除所有缓存
  clearAll: () => void
}

export const useContentCacheStore = create<ContentCacheState>()((set) => ({
  chartInterpretation: null,
  yearlyFortune: {},
  klineCache: null,

  // 对话历史初始化
  chartChatHistory: [],
  fortuneChatHistory: {},
  klineChatHistory: [],
  matchChatHistory: [],

  setChartInterpretation: (content) => set({ chartInterpretation: content }),

  setYearlyFortune: (year, content) => set((state) => ({
    yearlyFortune: { ...state.yearlyFortune, [year]: content },
  })),

  setKlineCache: (cache) => set({ klineCache: cache }),

  updateKlineReasons: (reasons) => set((state) => {
    if (!state.klineCache) return state
    const updatedLifetime = state.klineCache.lifetime.map(point => {
      const found = reasons.find(r => r.age === point.age)
      return found ? { ...point, reason: found.reason } : point
    })
    return {
      klineCache: {
        ...state.klineCache,
        lifetime: updatedLifetime,
        isGenerating: false,
      },
    }
  }),

  setKlineGenerating: (isGenerating) => set((state) => {
    if (!state.klineCache) return state
    return {
      klineCache: { ...state.klineCache, isGenerating },
    }
  }),

  // 对话历史设置
  setChartChatHistory: (history) => set({ chartChatHistory: history }),
  setFortuneChatHistory: (year, history) => set((state) => ({
    fortuneChatHistory: { ...state.fortuneChatHistory, [year]: history },
  })),
  setKlineChatHistory: (history) => set({ klineChatHistory: history }),
  setMatchChatHistory: (history) => set({ matchChatHistory: history }),

  clearAll: () => set({
    chartInterpretation: null,
    yearlyFortune: {},
    klineCache: null,
    chartChatHistory: [],
    fortuneChatHistory: {},
    klineChatHistory: [],
    matchChatHistory: [],
  }),
}))

/* ------------------------------------------------------------
   设置状态
   ------------------------------------------------------------ */

type ModelProvider = 'kimi' | 'gemini' | 'claude' | 'deepseek' | 'custom'

interface ProviderSettings {
  customBaseUrl: string
  customModel: string
}

const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  customBaseUrl: '',
  customModel: '',
}

interface SettingsState {
  provider: ModelProvider
  providerSettings: Record<ModelProvider, ProviderSettings>
  enableThinking: boolean
  enableWebSearch: boolean   // 启用联网搜索

  setProvider: (provider: ModelProvider) => void
  updateCurrentProvider: (settings: Partial<ProviderSettings>) => void
  setEnableThinking: (enable: boolean) => void
  setEnableWebSearch: (enable: boolean) => void

  // 便捷访问当前厂商配置
  getCurrentSettings: () => ProviderSettings
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: 'deepseek',
      providerSettings: {
        kimi: { ...DEFAULT_PROVIDER_SETTINGS },
        gemini: { ...DEFAULT_PROVIDER_SETTINGS },
        claude: { ...DEFAULT_PROVIDER_SETTINGS },
        deepseek: { ...DEFAULT_PROVIDER_SETTINGS },
        custom: { ...DEFAULT_PROVIDER_SETTINGS },
      },
      enableThinking: false,
      enableWebSearch: false,

      setProvider: (provider) => set({ provider }),

      updateCurrentProvider: (settings) => set((state) => ({
        providerSettings: {
          ...state.providerSettings,
          [state.provider]: {
            ...state.providerSettings[state.provider],
            ...settings,
          },
        },
      })),

      setEnableThinking: (enable) => set({ enableThinking: enable }),
      setEnableWebSearch: (enable) => set({ enableWebSearch: enable }),

      getCurrentSettings: () => {
        const state = get()
        return state.providerSettings[state.provider]
      },
    }),
    {
      name: 'ziwei-settings',
    }
  )
)
