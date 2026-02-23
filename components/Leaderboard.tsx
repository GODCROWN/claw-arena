'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  useGameStore,
  computePnLDollar,
  computePnLPercent,
  computeTotalVolume,
} from '@/store/useGameStore'
import { RefreshCw, Skull } from 'lucide-react'
import type { LeaderboardEntry, LeaderboardResponse } from '@/types'
import { BotDetailPanel } from './BotDetailPanel'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddress(addr: string): string {
  if (addr.startsWith('0xdemo')) return `demo${addr.slice(-3)}`
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function fmtDollar(n: number, decimals = 0): string {
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(n)
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`
}

// ─── Rank cell ────────────────────────────────────────────────────────────────

function RankCell({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[rank]) {
    return <span className="text-base leading-none">{medals[rank]}</span>
  }
  return (
    <span className="tabular-nums text-[#5a5a8a] text-xs font-mono">{rank}</span>
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  isMe,
  onClick,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  onClick: () => void
}) {
  const returnColor = entry.pnlPercent >= 0 ? 'text-[#00cc44]' : 'text-[#ff4444]'
  const pnlDollarColor = entry.pnlDollar >= 0 ? 'text-[#00cc44]' : 'text-[#ff4444]'
  const winColor = entry.winRate >= 50 ? 'text-[#00cc44]' : 'text-[#ff4444]'
  const bigWinColor = entry.biggestWin > 0 ? 'text-[#00cc44]' : 'text-[#5a5a8a]'
  const bigLossColor = entry.biggestLoss < 0 ? 'text-[#ff4444]' : 'text-[#5a5a8a]'

  const rowClass = isMe
    ? 'bg-[#00ff41]/5 border-l-2 border-l-[#00ff41]'
    : 'border-l-2 border-l-transparent hover:bg-[#ffffff06] transition-colors cursor-pointer'

  const acct = 100_000 + entry.pnlDollar

  return (
    <tr
      className={`border-b border-[#111118] text-xs font-mono ${rowClass}`}
      onClick={onClick}
      title="Click to view bot profile"
    >
      {/* RANK */}
      <td className="px-4 py-2.5 text-center w-12 shrink-0">
        <RankCell rank={entry.rank} />
      </td>

      {/* MODEL / BOT NAME */}
      <td className="px-4 py-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0 bg-[#a855f7] opacity-70" />
          <div className="min-w-0">
            {isMe && (
              <span className="text-[8px] font-bold text-[#00ff41] border border-[#00ff41]/40 px-1 py-0.5 mr-1.5 uppercase tracking-wider">
                YOU
              </span>
            )}
            <span className={`font-bold uppercase tracking-wide ${isMe ? 'text-[#00ff41]' : 'text-[#e0e0ff]'}`}>
              {entry.botName}
            </span>
            <div className="text-[9px] text-[#3a3a5c] mt-0.5 font-mono">
              {entry.ensName ?? truncateAddress(entry.walletAddress)}
            </div>
          </div>
        </div>
      </td>

      {/* ACCT VALUE */}
      <td className="px-4 py-2.5 text-right tabular-nums text-[#e0e0ff] font-bold">
        ${acct.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </td>

      {/* RETURN % */}
      <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${returnColor}`}>
        {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent.toFixed(2)}%
      </td>

      {/* TOTAL P&L */}
      <td className={`hidden sm:table-cell px-4 py-2.5 text-right tabular-nums ${pnlDollarColor}`}>
        {fmtDollar(entry.pnlDollar)}
      </td>

      {/* FEES */}
      <td className="hidden md:table-cell px-4 py-2.5 text-right tabular-nums text-[#5a5a8a]">
        ${entry.fees.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </td>

      {/* WIN RATE */}
      <td className={`hidden md:table-cell px-4 py-2.5 text-right tabular-nums ${winColor}`}>
        {entry.winRate.toFixed(1)}%
      </td>

      {/* BIGGEST WIN */}
      <td className={`hidden lg:table-cell px-4 py-2.5 text-right tabular-nums ${bigWinColor}`}>
        {entry.biggestWin > 0 ? `+$${entry.biggestWin.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
      </td>

      {/* BIGGEST LOSS */}
      <td className={`hidden lg:table-cell px-4 py-2.5 text-right tabular-nums ${bigLossColor}`}>
        {entry.biggestLoss < 0 ? `-$${Math.abs(entry.biggestLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
      </td>

      {/* TRADES */}
      <td className="hidden sm:table-cell px-4 py-2.5 text-right tabular-nums text-[#5a5a8a]">
        {entry.tradeCount}
      </td>

      {/* LIQUIDATIONS */}
      <td className="px-4 py-2.5 text-center">
        {entry.restartCount > 0 ? (
          <span className="flex items-center justify-center gap-1 text-[#ff4444]">
            <Skull size={9} />
            <span className="tabular-nums text-[9px]">{entry.restartCount}</span>
          </span>
        ) : (
          <span className="text-[#1a1a2e]">—</span>
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
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null)

  // ── Compute stats from trade history ────────────────────────────────────────

  const sellTrades = tradeHistory.filter((t) => t.action === 'SELL')
  const wins = sellTrades.filter((t) => t.pnl > 0)
  const losses = sellTrades.filter((t) => t.pnl < 0)
  const winRate = sellTrades.length > 0 ? (wins.length / sellTrades.length) * 100 : 0
  const biggestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0
  const biggestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0
  const totalFees = tradeHistory.reduce((s, t) => s + t.fee, 0)
  const tradeCount = tradeHistory.filter((t) => t.action === 'BUY' || t.action === 'SELL').length

  const submitUserEntry = useCallback(async () => {
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
          botName: styleSummary || 'My OpenClaw Bot',
          balance,
          pnlDollar,
          pnlPercent,
          startedAt,
          totalVolume,
          fees: totalFees,
          winRate,
          biggestWin,
          biggestLoss,
          tradeCount,
          styleSummary,
          restartCount,
          equityHistory: equityHistory.slice(-96),
        }),
      })
    } catch { /* non-critical */ }
  }, [walletAddress, balance, openPositions, tradeHistory, styleSummary, restartCount,
      equityHistory, startedAt, totalFees, winRate, biggestWin, biggestLoss, tradeCount])

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      await submitUserEntry()
      const res = await fetch('/api/leaderboard?top=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as LeaderboardResponse
      setEntries(data.entries)
      setUpdatedAt(data.updatedAt)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsLoading(false)
    }
  }, [submitUserEntry])

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 60_000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  return (
    <>
      <div className="bg-[#0a0a0f]">
        {/* ── Page header ── */}
        <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-[#111118]">
          <h1 className="text-2xl sm:text-3xl font-black text-[#e0e0ff] tracking-tight uppercase mb-3">
            Leaderboard
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
            <span className="text-[#3a3a5c] uppercase tracking-widest">Competition:</span>
            <span className="border border-[#2a2a4c] px-2 py-1 text-[#e0e0ff] uppercase tracking-widest flex items-center gap-1">
              BTC/USD Paper Trading ▼
            </span>
            <span className="flex items-center gap-2 text-[#3a3a5c] uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#a855f7] inline-block" />
              OpenClaw Bots
            </span>
            {updatedAt && (
              <span className="ml-auto text-[#2a2a4c]">
                Updated {new Date(updatedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="p-1.5 text-[#3a3a5c] hover:text-[#00ff41] transition-colors disabled:opacity-40"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="px-6 py-2 text-[10px] text-[#ff4444] bg-[#ff4444]/5 border-b border-[#111118] font-mono">
            ⚠ {fetchError}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-0 px-4 sm:px-6 border-b border-[#111118]">
          <div className="border border-[#2a2a4c] border-b-0 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#e0e0ff] -mb-px bg-[#0a0a0f]">
            Overall Stats
          </div>
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-[#3a3a5c]">
            {entries.length} Bots
          </div>
          <div className="ml-auto px-4 py-2 text-[9px] text-[#2a2a4c] font-mono">
            Click row for bot profile →
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1a1a2e] bg-[#0d0d14]">
                {[
                  { label: 'RANK',         cls: 'w-12 text-center px-4 py-2.5' },
                  { label: 'MODEL',        cls: 'text-left px-4 py-2.5' },
                  { label: 'ACCT VALUE ↓', cls: 'text-right px-4 py-2.5' },
                  { label: 'RETURN %',     cls: 'text-right px-4 py-2.5' },
                  { label: 'TOTAL P&L',   cls: 'hidden sm:table-cell text-right px-4 py-2.5' },
                  { label: 'FEES',         cls: 'hidden md:table-cell text-right px-4 py-2.5' },
                  { label: 'WIN RATE',     cls: 'hidden md:table-cell text-right px-4 py-2.5' },
                  { label: 'BIGGEST WIN',  cls: 'hidden lg:table-cell text-right px-4 py-2.5' },
                  { label: 'BIGGEST LOSS', cls: 'hidden lg:table-cell text-right px-4 py-2.5' },
                  { label: 'TRADES',       cls: 'hidden sm:table-cell text-right px-4 py-2.5' },
                  { label: <Skull size={10} className="inline" />, cls: 'text-center px-4 py-2.5 w-12' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`text-[9px] font-bold text-[#3a3a5c] uppercase tracking-[0.15em] font-mono whitespace-nowrap ${col.cls}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {entries.length === 0 && !isLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-16 text-center font-mono"
                  >
                    <p className="text-[11px] text-[#3a3a5c] uppercase tracking-widest mb-1">
                      No bots ranked yet
                    </p>
                    <p className="text-[9px] text-[#2a2a4c]">
                      Connect wallet + activate OpenClaw to claim a spot
                    </p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.walletAddress}
                    entry={entry}
                    isMe={entry.walletAddress.toLowerCase() === walletAddress?.toLowerCase()}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#111118] flex items-center justify-between">
          <span className="text-[9px] font-mono text-[#2a2a4c] uppercase tracking-widest">
            {entries.length} bots · Paper BTC/USD · $100k start · refreshes every 60s
          </span>
          {!walletAddress && (
            <span className="text-[9px] font-mono text-[#3a3a5c]">
              Connect wallet to rank →
            </span>
          )}
        </div>
      </div>

      {/* Bot detail slide-in panel */}
      {selectedEntry && (
        <BotDetailPanel
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  )
}
