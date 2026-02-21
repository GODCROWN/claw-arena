'use client'

/**
 * TickEngine — invisible client component that manages:
 * 1. Market price simulation (every 30 seconds for live-feel UI)
 * 2. Evaluation tick every 15 minutes — runs for ALL users, wallet optional
 * 3. Auto-submits stats to leaderboard only when a wallet is connected
 */

import { useEffect, useCallback } from 'react'
import { useGameStore, computeTotalVolume, computePnLDollar, computePnLPercent } from '@/store/useGameStore'
import { runEvaluationTick } from '@/lib/engine'

export function TickEngine() {
  const walletAddress = useGameStore((s) => s.walletAddress)
  const updateMarketPrices = useGameStore((s) => s.updateMarketPrices)
  const startedAt = useGameStore((s) => s.startedAt)
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const styleSummary = useGameStore((s) => s.styleSummary)
  const restartCount = useGameStore((s) => s.restartCount)
  const equityHistory = useGameStore((s) => s.equityHistory)

  // Submit leaderboard entry — only when a real wallet is connected
  const submitToLeaderboard = useCallback(async () => {
    if (!walletAddress) return // guests are unranked

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

  // Market price simulation — runs every 30s regardless of wallet status
  useEffect(() => {
    const priceInterval = setInterval(() => {
      updateMarketPrices()
    }, 30_000)

    return () => clearInterval(priceInterval)
  }, [updateMarketPrices])

  // Evaluation tick — runs every 15 minutes for ALL users (wallet optional)
  useEffect(() => {
    const tickInterval = setInterval(async () => {
      await runEvaluationTick()
      await submitToLeaderboard() // no-op for guests
    }, 15 * 60 * 1000)

    return () => clearInterval(tickInterval)
  }, [submitToLeaderboard])

  // Submit leaderboard when wallet first connects (or changes)
  useEffect(() => {
    if (walletAddress) {
      submitToLeaderboard()
    }
  }, [walletAddress, submitToLeaderboard])

  return null
}
