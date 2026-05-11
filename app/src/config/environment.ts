export interface AppConfig {
  apiBaseUrl: string
  isDevelopment: boolean
  isProduction: boolean
  version: string
}

const getEnvironment = (): AppConfig => {
  const mode = import.meta.env.MODE
  const isDevelopment = mode === 'development'
  const isProduction = mode === 'production'

  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001'),
    isDevelopment,
    isProduction,
    version: import.meta.env.VITE_APP_VERSION || '1.0.0'
  }
}

export const config = getEnvironment()

export const validateConfig = (): void => {
  if (!config.apiBaseUrl) {
    throw new Error('API base URL is required')
  }
}
