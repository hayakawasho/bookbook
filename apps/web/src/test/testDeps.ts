import { type Profile, resolveAppConfig } from '../_components/app/config'
import { createRepositories } from '../_components/app/repositories'

import type { AppConfig } from '../_components/app/config'
import type { Repositories } from '../_components/app/repositories'

export function createTestDeps(profile: Profile = 'mock'): {
  config: AppConfig
  repositories: Repositories
} {
  const config = resolveAppConfig({ VITE_APP_PROFILE: profile })
  return { config, repositories: createRepositories(config) }
}
