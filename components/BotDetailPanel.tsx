'use client'

import { useEffect, useRef } from 'react'
import { X, Skull, TrendingUp, TrendingDown } from 'lucide-react'
import type { LeaderboardEntry } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddress(addr: string): string {
  if (addr.startsWith('0xdemo')) return `demo${addr.slice(-3)}`
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function fmtDollar(n: number, sign = true): string {
  const s = sign ? (n >= 0 ? '+' : '-') : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${s}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${s}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `${s}$${abs.toFixed(2)}`
}

// ─── Stat grid cell ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  color = 'text-[#e0e0ff]',
  sub,
}: {
  label: string
  value: string
  color?: string
  sub?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] text-[#3a3a5c] uppercase tracking-widest font-medium">{label}</span>
      <span className={`text-base font-bold tabular-nums leading-none ${color}`}>{value}</span>
      {sub && <span className="text-[9px] text-[#3a3a5c] tabular-nums">{sub}</span>}
    </div>
  )
}

// ─── Equity sparkline (pure SVG, no chart lib) ────────────────────────────────

function EquitySparkline({ data }: { data: { timestamp: number; equity: number }[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-[9px] text-[#2a2a4c]">
        No equity data
      </div>
    )
  }

  const W = 320
  const H = 64
  const pad = 4

  const minE = Math.min(...data.map((d) => d.equity))
  const maxE = Math.max(...data.map((d) => d.equity))
  const range = maxE - minE || 1

  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = pad + ((maxE - d.equity) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const last = data[data.length - 1]
  const first = data[0]
  const up = last.equity >= first.equity
  const lineColor = up ? '#00ff41' : '#ff4444'
  const fillColor = up ? 'rgba(0,255,65,0.05)' : 'rgba(255,68,68,0.05)'

  const areaPath = `M ${pts[0]} L ${pts.join(' L ')} L ${pad + (W - pad * 2)},${H - pad} L ${pad},${H - pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* baseline $100k */}
      {(() => {
        const baselineY = pad + ((maxE - 100_000) / range) * (H - pad * 2)
        if (baselineY > pad && baselineY < H - pad) {
          return (
            <line
              x1={pad}
              y1={baselineY}
              x2={W - pad}
              y2={baselineY}
              stroke="#2a2a4c"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
          )
        }
        return null
      })()}
    </svg>
  )
}

// ─── Hold time bar (Long / Flat only — no shorting) ───────────────────────────

function HoldTimesBar({ entry }: { entry: LeaderboardEntry }) {
  // Estimate from trade count: rough heuristic — real data would come from equityHistory
  // Use equityHistory ticks to estimate % time in position vs flat
  const totalTicks = entry.equityHistory?.length ?? 0
  let longTicks = 0
  if (totalTicks > 0 && entry.tradeCount > 0) {
    // Rough: assume average hold = daysLive / tradeCount * 2 (buy + sell = 2 trades per round trip)
    const roundTrips = entry.tradeCount / 2
    const avgHoldDays = roundTrips > 0 ? entry.daysLive / roundTrips : 0
    const longFraction = Math.min(0.95, avgHoldDays / Math.max(1, entry.daysLive))
    longTicks = Math.round(longFraction * 100)
  }
  const flatPct = Math.max(0, 100 - longTicks)
  const longPct = longTicks

  return (
    <div>
      <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">Hold Times</p>
      <div className="flex gap-1 h-2 mb-2">
        <div
          className="h-full bg-[#00ff41]/60 rounded-sm"
          style={{ width: `${longPct}%` }}
        />
        <div
          className="h-full bg-[#2a2a4c] rounded-sm flex-1"
          style={{ width: `${flatPct}%` }}
        />
      </div>
      <div className="flex gap-4 text-[9px] font-mono">
        <span>
          <span className="text-[#00ff41]">Long</span>
          <span className="text-[#5a5a8a] ml-1">{longPct}%</span>
        </span>
        <span>
          <span className="text-[#3a3a5c]">Flat</span>
          <span className="text-[#5a5a8a] ml-1">{flatPct}%</span>
        </span>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface BotDetailPanelProps {
  entry: LeaderboardEntry | null
  onClose: () => void
}

export function BotDetailPanel({ entry, onClose }: BotDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  if (!entry) return null

  const acctValue = 100_000 + entry.pnlDollar
  const pnlColor = entry.pnlDollar >= 0 ? 'text-[#00ff41]' : 'text-[#ff4444]'
  const returnColor = entry.pnlPercent >= 0 ? 'text-[#00ff41]' : 'text-[#ff4444]'
  const netRealized = entry.pnlDollar - entry.fees

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-end"
      onClick={handleBackdrop}
    >
      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="relative h-full w-full max-w-md bg-[#0a0a0f] border-l border-[#1a1a2e] overflow-y-auto"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-[#111118] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#5a5a8a] uppercase tracking-widest font-mono">
              Rank #{entry.rank}
            </span>
            {entry.restartCount > 0 && (
              <span className="flex items-center gap-1 text-[#ff4444] text-[9px]">
                <Skull size={9} />
                {entry.restartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#3a3a5c] hover:text-[#e0e0ff] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Bot identity card ── */}
        <div className="px-5 py-5 border-b border-[#111118]">
          {/* Strategy badge */}
          <div className="mb-3">
            <span className="text-[8px] font-bold text-[#a855f7] border border-[#a855f7]/30 px-2 py-0.5 uppercase tracking-widest">
              {entry.styleSummary || 'OpenClaw Bot'}
            </span>
          </div>

          {/* Bot name + icon */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-sm bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-[#a855f7] opacity-70" />
            </span>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#e0e0ff] leading-none">
                {entry.botName}
              </h2>
              <div className="text-[9px] text-[#3a3a5c] font-mono mt-0.5">
                {entry.ensName ?? truncateAddress(entry.walletAddress)}
              </div>
            </div>
          </div>

          {/* Account value + cash */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0f0f1a] border border-[#1a1a2e] p-3">
              <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">Total Acct Value</p>
              <p className="text-lg font-bold tabular-nums text-[#e0e0ff]">
                ${acctValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-[#0f0f1a] border border-[#1a1a2e] p-3">
              <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">Days Live</p>
              <p className="text-lg font-bold tabular-nums text-[#5a5a8a]">
                {entry.daysLive}d
              </p>
            </div>
          </div>
        </div>

        {/* ── P&L stats bar ── */}
        <div className="px-5 py-4 border-b border-[#111118] grid grid-cols-3 divide-x divide-[#1a1a2e]">
          <div className="pr-4">
            <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">Total P&L</p>
            <p className={`text-sm font-bold tabular-nums ${pnlColor}`}>
              {fmtDollar(entry.pnlDollar)}
            </p>
            <p className={`text-[9px] tabular-nums ${returnColor}`}>
              {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent.toFixed(2)}%
            </p>
          </div>
          <div className="px-4">
            <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">Total Fees</p>
            <p className="text-sm font-bold tabular-nums text-[#5a5a8a]">
              ${entry.fees.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">Net Realized</p>
            <p className={`text-sm font-bold tabular-nums ${netRealized >= 0 ? 'text-[#00ff41]' : 'text-[#ff4444]'}`}>
              {fmtDollar(netRealized)}
            </p>
          </div>
        </div>

        {/* ── Equity sparkline ── */}
        {entry.equityHistory && entry.equityHistory.length > 1 && (
          <div className="px-5 py-4 border-b border-[#111118]">
            <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">Equity Curve</p>
            <EquitySparkline data={entry.equityHistory} />
            <div className="flex justify-between text-[8px] text-[#2a2a4c] mt-1 font-mono">
              <span>$100k start</span>
              <span>${acctValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}

        {/* ── Performance metrics ── */}
        <div className="px-5 py-4 border-b border-[#111118]">
          <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-3">Performance</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <StatCell
              label="Win Rate"
              value={`${entry.winRate.toFixed(1)}%`}
              color={entry.winRate >= 50 ? 'text-[#00ff41]' : 'text-[#ff4444]'}
            />
            <StatCell
              label="Trades"
              value={`${entry.tradeCount}`}
              color="text-[#e0e0ff]"
            />
            <StatCell
              label="Biggest Win"
              value={entry.biggestWin > 0 ? `+$${entry.biggestWin.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              color={entry.biggestWin > 0 ? 'text-[#00ff41]' : 'text-[#3a3a5c]'}
            />
            <StatCell
              label="Biggest Loss"
              value={entry.biggestLoss < 0 ? `-$${Math.abs(entry.biggestLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              color={entry.biggestLoss < 0 ? 'text-[#ff4444]' : 'text-[#3a3a5c]'}
            />
            <StatCell
              label="Total Volume"
              value={`$${(entry.totalVolume / 1000).toFixed(0)}k`}
              color="text-[#5a5a8a]"
            />
            <StatCell
              label="Liquidations"
              value={entry.restartCount > 0 ? `×${entry.restartCount}` : '—'}
              color={entry.restartCount > 0 ? 'text-[#ff4444]' : 'text-[#3a3a5c]'}
            />
          </div>
        </div>

        {/* ── Hold times ── */}
        <div className="px-5 py-4 border-b border-[#111118]">
          <HoldTimesBar entry={entry} />
        </div>

        {/* ── Wins vs Losses visual bar ── */}
        <div className="px-5 py-4 border-b border-[#111118]">
          <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">Trade Results</p>
          {entry.tradeCount > 0 ? (
            <>
              <div className="flex gap-0.5 h-2 mb-2 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#00ff41]/70"
                  style={{ width: `${entry.winRate}%` }}
                />
                <div
                  className="h-full bg-[#ff4444]/50 flex-1"
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#5a5a8a]">
                <span className="text-[#00ff41]">
                  {Math.round((entry.winRate / 100) * (entry.tradeCount / 2))} wins
                </span>
                <span className="text-[#ff4444]">
                  {Math.round(((100 - entry.winRate) / 100) * (entry.tradeCount / 2))} losses
                </span>
              </div>
            </>
          ) : (
            <p className="text-[9px] text-[#2a2a4c]">No trades yet</p>
          )}
        </div>

        {/* ── P&L trend arrows ── */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            {entry.pnlDollar >= 0 ? (
              <TrendingUp size={16} className="text-[#00ff41]" />
            ) : (
              <TrendingDown size={16} className="text-[#ff4444]" />
            )}
            <div className="text-[9px] font-mono text-[#3a3a5c] leading-relaxed">
              Trading BTC/USD Spot · $100k paper capital · 0.1% fee per trade · Kelly ¼ sizing
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
