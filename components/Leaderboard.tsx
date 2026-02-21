'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGameStore, computePnLDollar, computePnLPercent, computeDaysLive, computeTotalVolume } from '@/store/useGameStore'
import { Trophy, Skull, RefreshCw } from 'lucide-react'
import type { LeaderboardEntry, LeaderboardResponse } from '@/types'

// ─── Truncate wallet address ──────────────────────────────────────────────────

function truncateAddress(address: string): string {
  if (address.startsWith('0xdemo')) {
    return `Demo Bot ${address.slice(-3)}`
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-[#ffd700] font-bold text-sm">🥇</span>
  if (rank === 2)
    return <span className="text-[#c0c0c0] font-bold text-sm">🥈</span>
  if (rank === 3)
    return <span className="text-[#cd7f32] font-bold text-sm">🥉</span>
  return (
    <span className="text-[#5a5a8a] text-xs tabular-nums w-4 text-center">
      {rank}
    </span>
  )
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  isCurrentUser: boolean
}) {
  const pnlColor = entry.pnlPercent >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
  const rowBg = isCurrentUser
    ? 'bg-[#00ff41]/5 border-l-2 border-l-[#00ff41]'
    : 'border-l-2 border-l-transparent hover:bg-[#0f0f1a]'

  return (
    <tr
      className={`text-xs border-b border-[#1a1a2e] transition-colors ${rowBg}`}
    >
      {/* Rank */}
      <td className="px-3 py-2 text-center">
        <RankBadge rank={entry.rank} />
      </td>

      {/* Wallet */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {isCurrentUser && (
            <span className="text-[8px] text-[#00ff41] border border-[#00ff41]/30 px-1 py-0.5">
              YOU
            </span>
          )}
          <span className={isCurrentUser ? 'text-[#00ff41]' : 'text-[#e0e0ff]'}>
            {entry.ensName ?? truncateAddress(entry.walletAddress)}
          </span>
        </div>
      </td>

      {/* PnL $ */}
      <td className={`px-3 py-2 tabular-nums text-right ${pnlColor}`}>
        {entry.pnlDollar >= 0 ? '+' : ''}
        ${Math.abs(entry.pnlDollar).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </td>

      {/* PnL % */}
      <td className={`px-3 py-2 tabular-nums text-right font-bold ${pnlColor}`}>
        {entry.pnlPercent >= 0 ? '+' : ''}
        {entry.pnlPercent.toFixed(2)}%
      </td>

      {/* Days Live */}
      <td className="px-3 py-2 tabular-nums text-right text-[#5a5a8a]">
        {entry.daysLive}d
      </td>

      {/* Volume */}
      <td className="px-3 py-2 tabular-nums text-right text-[#5a5a8a]">
        ${(entry.totalVolume / 1000).toFixed(0)}k
      </td>

      {/* Style */}
      <td className="px-3 py-2 text-[#00d4ff] max-w-[140px] truncate">
        {entry.styleSummary}
      </td>

      {/* Restarts */}
      <td className="px-3 py-2 text-center">
        {entry.restartCount > 0 ? (
          <div className="flex items-center justify-center gap-1">
            <Skull size={10} className="text-[#ff3333]" />
            <span className="text-[#ff3333] text-[10px]">{entry.restartCount}</span>
          </div>
        ) : (
          <span className="text-[#3a3a5c]">—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Main Leaderboard ─────────────────────────────────────────────────────────

export function Leaderboard() {
  const walletAddress = useGameStore((s) => s.walletAddress)
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const styleSummary = useGameStore((s) => s.styleSummary)
  const restartCount = useGameStore((s) => s.restartCount)
  const equityHistory = useGameStore((s) => s.equityHistory)
  const startedAt = useGameStore((s) => s.startedAt)

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Submit current user to leaderboard
  const submitUserEntry = useCallback(async () => {
    if (!walletAddress || !startedAt) return

    const pnlDollar = computePnLDollar(balance, openPositions)
    const pnlPercent = computePnLPercent(balance, openPositions)
    const daysLive = computeDaysLive(startedAt)
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
      // Non-critical: don't surface to user
    }
  }, [walletAddress, balance, openPositions, tradeHistory, styleSummary, restartCount, equityHistory, startedAt])

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      // Submit user's latest stats first
      await submitUserEntry()

      const res = await fetch('/api/leaderboard?top=50')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as LeaderboardResponse
      setEntries(data.entries)
      setUpdatedAt(data.updatedAt)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
    } finally {
      setIsLoading(false)
    }
  }, [submitUserEntry])

  // Initial fetch + 60s refresh
  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 60_000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-[#ffd700]" />
          <h2 className="text-xs font-bold text-[#e0e0ff] tracking-widest uppercase">
            Global Leaderboard
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-[9px] text-[#3a3a5c]">
              Updated {new Date(updatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchLeaderboard}
            disabled={isLoading}
            className="text-[#3a3a5c] hover:text-[#00ff41] transition-colors disabled:opacity-50"
            title="Refresh leaderboard"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="px-4 py-2 text-[10px] text-[#ff3333] bg-[#ff3333]/5 border-b border-[#1a1a2e]">
          Error: {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-[9px] text-[#3a3a5c] uppercase tracking-widest border-b border-[#1a1a2e]">
              <th className="px-3 py-2 text-center font-normal w-8">#</th>
              <th className="px-3 py-2 text-left font-normal">Wallet</th>
              <th className="px-3 py-2 text-right font-normal">PnL $</th>
              <th className="px-3 py-2 text-right font-normal">PnL %</th>
              <th className="px-3 py-2 text-right font-normal">Days</th>
              <th className="px-3 py-2 text-right font-normal">Volume</th>
              <th className="px-3 py-2 text-left font-normal">Style</th>
              <th className="px-3 py-2 text-center font-normal">
                <Skull size={10} className="inline" />
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-[10px] text-[#3a3a5c]"
                >
                  No entries yet. Connect your wallet to join the arena.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <LeaderboardRow
                  key={entry.walletAddress}
                  entry={entry}
                  isCurrentUser={
                    entry.walletAddress.toLowerCase() ===
                    walletAddress?.toLowerCase()
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1a1a2e] flex justify-between items-center">
        <span className="text-[9px] text-[#3a3a5c]">
          {entries.length} bots competing
        </span>
        <span className="text-[9px] text-[#3a3a5c]">Refreshes every 60s</span>
      </div>
    </div>
  )
}
