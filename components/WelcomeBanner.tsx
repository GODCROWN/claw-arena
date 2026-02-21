'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { X, Trophy, Zap } from 'lucide-react'

/**
 * WelcomeBanner — compact dismissible callout for guests.
 * Does NOT block the trading UI. Disappears once wallet connects or is dismissed.
 */
export function WelcomeBanner() {
  const { isConnected } = useAccount()
  const [dismissed, setDismissed] = useState(false)

  // Hide once wallet is connected or manually dismissed
  if (isConnected || dismissed) return null

  return (
    <div className="mb-4 border border-[#00ff41]/20 bg-[#00ff41]/5 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Logo text */}
        <span className="text-[#00ff41] font-bold text-sm tracking-widest glow-green hidden sm:block">
          ⬡ CLAWARENA
        </span>

        {/* Quick facts */}
        <div className="flex items-center gap-3 text-[9px] text-[#5a5a8a]">
          <span className="flex items-center gap-1">
            <Zap size={9} className="text-[#ffd700]" />
            $100k virtual portfolio
          </span>
          <span className="text-[#1a1a2e]">|</span>
          <span className="flex items-center gap-1">
            <Trophy size={9} className="text-[#00d4ff]" />
            Connect wallet to join global leaderboard
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="border border-[#00ff41]/30 text-[10px]">
          <ConnectButton label="Connect to Rank" showBalance={false} />
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#3a3a5c] hover:text-[#5a5a8a] transition-colors shrink-0"
          title="Dismiss — you can still trade as a guest"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
