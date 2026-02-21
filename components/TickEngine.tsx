'use client'

/**
 * TickEngine — invisible client component that manages:
 * 1. Market price simulation (every 30 seconds for realistic UX)
 * 2. Manual "force tick" button for dev/demo purposes
 * 3. Auto-submits user stats to leaderboard on each tick
 */

import { useEffect, useCallback } from 'react'
import { useGameStore, computeTotalVolume, computePnLDollar, computePnLPercent } from '@/store/useGameStore'
import { useAccount } from 'wagmi'
import { runEvaluationTick } from '@/lib/engine'

export function TickEngine() {
  const { isConnected } = useAccount()
  const walletAddress = useGameStore((s) => s.walletAddress)
  const updateMarketPrices = useGameStore((s) => s.updateMarketPrices)
  const startedAt = useGameStore((s) => s.startedAt)
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const styleSummary = useGameStore((s) => s.styleSummary)
  const restartCount = useGameStore((s) => s.restartCount)
  const equityHistory = useGameStore((s) => s.equityHistory)

  // Submit leaderboard entry
  const submitToLeaderboard = useCallback(async () => {
    if (!walletAddress || !startedAt) return

    const pnlDollar = computePnLDollar(balance, openPositions)
    const pnlPercent = computePnLPercent(balance, openPositions)
    const totalVolume = computeTotalVolume(tradeHistory)

    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          balance,
          pnlDollar,
          pnlPercent,
          startedAt,
          totalVolume,
          styleSummary,
          restartCount,
          equityHistory: equityHistory.slice(-96),
        }),
      })
    } catch {
      // Non-critical
    }
  }, [walletAddress, balance, openPositions, tradeHistory, styleSummary, restartCount, equityHistory, startedAt])

  // Market price simulation — runs every 30s for live-feel UI
  useEffect(() => {
    const priceInterval = setInterval(() => {
      updateMarketPrices()
    }, 30_000)

    return () => clearInterval(priceInterval)
  }, [updateMarketPrices])

  // Evaluation tick — runs every 15 minutes
  useEffect(() => {
    if (!isConnected || !walletAddress) return

    const tickInterval = setInterval(async () => {
      await runEvaluationTick()
      await submitToLeaderboard()
    }, 15 * 60 * 1000)

    return () => clearInterval(tickInterval)
  }, [isConnected, walletAddress, submitToLeaderboard])

  // Submit leaderboard on first connect
  useEffect(() => {
    if (walletAddress && startedAt) {
      submitToLeaderboard()
    }
  }, [walletAddress, startedAt, submitToLeaderboard])

  // This component renders nothing — pure side-effect logic
  return null
}
