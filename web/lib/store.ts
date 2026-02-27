import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Credentials {
  basicAuth: { username: string; password: string }
  binance: { apiKey: string; secretKey: string }
  coinbase: { apiKey: string; apiSecret: string; keyFile: string }
}

interface SettingsState {
  credentials: Credentials
  correlationEnabled: boolean
  correlationId: string
  setCredentials: <K extends keyof Credentials>(
    exchange: K,
    values: Credentials[K]
  ) => void
  setCorrelationEnabled: (enabled: boolean) => void
  setCorrelationId: (id: string) => void
  generateCorrelationId: () => void
  clearCredentials: () => void
}

const defaultCredentials: Credentials = {
  basicAuth: { username: '', password: '' },
  binance: { apiKey: '', secretKey: '' },
  coinbase: { apiKey: '', apiSecret: '', keyFile: '' },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      credentials: defaultCredentials,
      correlationEnabled: false,
      correlationId: '',
      setCredentials: (exchange, values) =>
        set((state) => ({
          credentials: { ...state.credentials, [exchange]: values },
        })),
      setCorrelationEnabled: (enabled) =>
        set({ correlationEnabled: enabled }),
      setCorrelationId: (id) => set({ correlationId: id }),
      generateCorrelationId: () =>
        set({ correlationId: crypto.randomUUID() }),
      clearCredentials: () => set({ credentials: defaultCredentials }),
    }),
    {
      name: 'crypto-gateway-settings',
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<SettingsState>),
        credentials: defaultCredentials,
      }),
      partialize: (state) => ({
        correlationEnabled: state.correlationEnabled,
        correlationId: state.correlationId,
      }),
    }
  )
)
