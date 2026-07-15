/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PROFILE?: string
}

declare module '*.wav' {
  const src: string
  export default src
}
