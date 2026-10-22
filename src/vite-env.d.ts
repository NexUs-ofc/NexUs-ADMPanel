/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string
  readonly VITE_CORE_API_URL?: string
  readonly VITE_NOTIFY_API_URL?: string
  readonly VITE_IA_API_URL?: string
  readonly VITE_BI_IA_API_URL?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_ADMIN_KEY_SHA256?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
