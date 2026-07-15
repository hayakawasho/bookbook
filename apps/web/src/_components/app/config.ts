export type Profile = 'production' | 'mock'

export type AppConfig = {
  profile: Profile
  apiBase: string
}

type ConfigEnv = {
  VITE_APP_PROFILE?: string
  PROD?: boolean
}

const API_BASE = '/api'

export function resolveAppConfig(env: ConfigEnv): AppConfig {
  const profile = env.VITE_APP_PROFILE

  if (profile === undefined) {
    /** 本番ビルドの設定漏れは mock で握りつぶさず起動時に落とす。dev は .env なしでも動かす */
    if (env.PROD) {
      throw new Error('VITE_APP_PROFILE must be set in production builds')
    }
    return { profile: 'mock', apiBase: API_BASE }
  }

  if (profile !== 'production' && profile !== 'mock') {
    throw new Error(`Invalid VITE_APP_PROFILE: "${profile}" (expected "production" | "mock")`)
  }

  return { profile, apiBase: API_BASE }
}
