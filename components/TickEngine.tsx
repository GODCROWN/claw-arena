'use client'

/**
 * TickEngine — invisible client component that manages:
 * 1. Live BTC price from Binance (every 30 seconds)
 * 2. Simulated price updates for ETH/SOL/ARB (every 30 seconds)
 * 3. Evaluation tick every 15 minutes — runs for ALL users, wallet optional
 * 4. Auto-submits stats to leaderboard only when a wallet is connected
 *
 * BTC uses real Binance SPOT data via /api/market/btc proxy.
 * All other assets remain simulated.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useGameStore, computeTotalVolume, computePnLDollar, computePnLPercent } from '@/store/useGameStore'
import { runEvaluationTick } from '@/lib/engine'
import type { BtcMarketData } from '@/lib/binance'

export function TickEngine() {
  const walletAddress = useGameStore((s) => s.walletAddress)
  const updateMarketPrices = useGameStore((s) => s.updateMarketPrices)
  const setBtcMarketData = useGameStore((s) => s.setBtcMarketData)
  const addThought = useGameStore((s) => s.addThought)
  const startedAt = useGameStore((s) => s.startedAt)
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const styleSummary = useGameStore((s) => s.styleSummary)
  const restartCount = useGameStore((s) => s.restartCount)
  const equityHistory = useGameStore((s) => s.equityHistory)

  // Track last BTC price for change logging
  const lastBtcPrice = useRef<number | null>(null)

  // ── Fetch live BTC price from our Binance proxy ───────────────────────────

  const fetchLiveBtc = useCallback(async () => {
    try {
      const res = await fetch('/api/market/btc', { cache: 'no-store' })
      if (!res.ok) {
        console.warn('[TickEngine] BTC fetch failed:', res.status)
        return
      }
      const data = await res.json() as BtcMarketData

      setBtcMarketData(data.price, data.ma30, data.priceHistory, data.change24h)

      // Log notable price moves to ThoughtStream
      if (lastBtcPrice.current !== null) {
        const delta = ((data.price - lastBtcPrice.current) / lastBtcPrice.current) * 100
        if (Math.abs(delta) >= 0.5) {
          const dir = delta > 0 ? '▲' : '▼'
          addThought(
            'SYS',
            `[BTC LIVE] ${dir} $${data.price.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%) | MA30: $${data.ma30.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          )
        }
      }
      lastBtcPrice.current = data.price
    } catch (err) {
      console.warn('[TickEngine] BTC fetch error:', err)
      // Fall back gracefully — simulated prices continue for BTC
    }
  }, [setBtcMarketData, addThought])

  // ── Submit leaderboard entry — only when a real wallet is connected ───────

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

  // ── Live BTC price — fetch immediately then every 30s ─────────────────────

  useEffect(() => {
    fetchLiveBtc() // immediate on mount
    const btcInterval = setInterval(fetchLiveBtc, 30_000)
    return () => clearInterval(btcInterval)
  }, [fetchLiveBtc])

  // ── Simulated price updates for non-BTC assets — every 30s ───────────────
  // updateMarketPrices() handles all assets but BTC is overridden by live data.
  // We still call it to keep ETH/SOL/ARB ticking.

  useEffect(() => {
    const priceInterval = setInterval(() => {
      updateMarketPrices()
    }, 30_000)
    return () => clearInterval(priceInterval)
  }, [updateMarketPrices])

  // ── Evaluation tick — every 15 minutes for ALL users ─────────────────────

  useEffect(() => {
    const tickInterval = setInterval(async () => {
      await runEvaluationTick()
      await submitToLeaderboard() // no-op for guests
    }, 15 * 60 * 1000)

    return () => clearInterval(tickInterval)
  }, [submitToLeaderboard])

  // ── Submit leaderboard when wallet first connects (or changes) ────────────

  useEffect(() => {
    if (walletAddress) {
      submitToLeaderboard()
    }
  }, [walletAddress, submitToLeaderboard])

  return null
}
