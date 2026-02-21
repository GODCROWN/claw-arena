'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { runEvaluationTick } from '@/lib/engine'
import { Play, Loader2 } from 'lucide-react'

/**
 * ForceTickButton — manually triggers an evaluation tick.
 * Always visible — wallet connection is not required to trade.
 */
export function ForceTickButton() {
  const addThought = useGameStore((s) => s.addThought)
  const [isRunning, setIsRunning] = useState(false)

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
      className="flex items-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 border border-[#1a1a2e] text-[#3a3a5c] hover:border-[#00ff41]/30 hover:text-[#00ff41] transition-all text-[9px] uppercase tracking-widest disabled:opacity-40 min-h-[44px] sm:min-h-0"
      title="Manually trigger evaluation tick"
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
