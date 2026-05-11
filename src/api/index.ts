import { config } from '@/config/environment'

const BASE = config.apiBaseUrl

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('ziwei-token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch (err) {
    throw new Error('网络连接失败，请检查后端服务是否启动')
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error('服务器响应异常')
  }

  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data as T
}

export interface UserInfo {
  id: number
  username: string
  phone: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  role: string
  points: number
  invite_code: string | null
  created_at: string
}

export interface AuthResponse {
  token: string
  user: UserInfo
}

export interface PointsLogEntry {
  id: number
  user_id: number
  amount: number
  type: string
  description: string
  created_at: string
}

export interface HistoryEntry {
  id: number
  type: string
  title: string | null
  content: string
  birth_info: any | null
  created_at: string
}

export interface PointsConfig {
  key: string
  name: string
  cost: number
}

export interface RechargePackage {
  amount: number
  points: number
  label: string
  bonus?: number
}

export interface RechargeConfig {
  wechatQR: string
  alipayQR: string
  packages: RechargePackage[]
}

export interface RechargeOrder {
  id: number
  user_id: number
  amount: number
  points: number
  payment_method: string
  status: string
  voucher_url: string | null
  voucher_note: string | null
  admin_note: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export const api = {
  auth: {
    register: (phone: string, password: string, invite_code?: string) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password, invite_code }),
      }),
    login: (phone: string, password: string) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }),
  },

  user: {
    me: () => request<UserInfo>('/api/user/me'),
    update: (data: { email?: string; avatar_url?: string; display_name?: string }) =>
      request<UserInfo>('/api/user/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    pointsLog: (limit = 30, offset = 0) =>
      request<{ logs: PointsLogEntry[]; total: number }>(
        `/api/user/points-log?limit=${limit}&offset=${offset}`
      ),
    history: {
      list: (type?: string, limit = 50, offset = 0) =>
        request<{ histories: HistoryEntry[]; total: number }>(
          `/api/user/history?type=${type || ''}&limit=${limit}&offset=${offset}`
        ),
      get: (id: number) =>
        request<HistoryEntry>(`/api/user/history/${id}`),
      save: (data: { type: string; title?: string; content: string; birth_info?: any }) =>
        request<{ success: boolean; id: number }>('/api/user/history', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        request<{ success: boolean }>(`/api/user/history/${id}`, {
          method: 'DELETE',
        }),
    },
  },

  redeem: {
    use: (code: string) =>
      request<{ points_added: number; current_points: number }>('/api/redeem/use', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
  },

  recharge: {
    getConfig: () => request<RechargeConfig>('/api/recharge/config'),
    apply: (data: { amount: number; points: number; payment_method: string; voucher_note?: string }) =>
      request<{ success: boolean; order: RechargeOrder }>('/api/recharge/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    history: (limit = 20, offset = 0) =>
      request<{ orders: RechargeOrder[]; total: number }>(
        `/api/recharge/history?limit=${limit}&offset=${offset}`
      ),
  },

  pointsConfig: () => request<PointsConfig[]>('/api/points/config'),
}
