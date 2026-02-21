'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useAccount } from 'wagmi'
import { runEvaluationTick } from '@/lib/engine'
import { Play, Loader2 } from 'lucide-react'

/**
 * ForceTickButton — a dev/demo utility that manually triggers an evaluation tick.
 * Useful for testing without waiting 15 minutes.
 * Hidden from disconnected users.
 */
export function ForceTickButton() {
  const { isConnected } = useAccount()
  const walletAddress = useGameStore((s) => s.walletAddress)
  const addThought = useGameStore((s) => s.addThought)
  const [isRunning, setIsRunning] = useState(false)

  if (!isConnected || !walletAddress) return null

  const handleForceTick = async () => {
    if (isRunning) return
    setIsRunning(true)
    addThought('SYS', '[SYS] Manual tick triggered by user.')

    try {
      await runEvaluationTick()
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <button
      onClick={handleForceTick}
      disabled={isRunning}
      className="flex items-center gap-2 px-3 py-1.5 border border-[#1a1a2e] text-[#3a3a5c] hover:border-[#00ff41]/30 hover:text-[#00ff41] transition-all text-[9px] uppercase tracking-widest disabled:opacity-40"
      title="Manually trigger evaluation tick (dev/demo)"
    >
      {isRunning ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Play size={10} />
      )}
      Force Tick
    </button>
  )
}
