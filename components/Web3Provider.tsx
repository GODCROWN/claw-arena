'use client'

import { ReactNode } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, base, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit'

import '@rainbow-me/rainbowkit/styles.css'

// ─── Wagmi + RainbowKit config ────────────────────────────────────────────────

const config = getDefaultConfig({
  appName: 'ClawArena',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'fallback-id',
  chains: [mainnet, base, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: true,
})

// ─── QueryClient singleton ────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

// ─── Custom RainbowKit dark theme ─────────────────────────────────────────────

const arenaTheme = darkTheme({
  accentColor: '#00ff41',
  accentColorForeground: '#0a0a0f',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
})

// ─── Provider component ───────────────────────────────────────────────────────

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={arenaTheme}
          locale="en-US"
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Re-export config for use in other wagmi hooks
export { config as wagmiConfig }
