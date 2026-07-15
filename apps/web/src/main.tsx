import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { SWRConfig } from 'swr'

import { App } from './_components/app/App.tsx'
import { resolveAppConfig } from './_components/app/config.ts'
import { createRepositories } from './_components/app/repositories.ts'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'

registerServiceWorker()

const config = resolveAppConfig(import.meta.env)
const repositories = createRepositories(config)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SWRConfig
      value={{
        errorRetryCount: 1,
        errorRetryInterval: 5000,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      }}
    >
      <BrowserRouter>
        <App config={config} repositories={repositories} />
      </BrowserRouter>
    </SWRConfig>
  </StrictMode>,
)
