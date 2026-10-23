export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  contextTokens?: number
  contextWindow: number
  contextPercent?: number
  limits: Limit[]
}

export type Category = { name: string; tokens: number }

declare module 'claude-code' {
  interface PluginState {
    'session-usage': {
      usage: Usage | null
      tokens: Tokens
      turns: number
      history: number[]
      categories: Category[]
      isHidden: boolean
    }
  }
}
