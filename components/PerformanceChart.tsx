'use client'

import { useGameStore, computeEquity, computePnLPercent, computePnLDollar, computeDaysLive } from '@/store/useGameStore'

// ─── Stat cell ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  color = 'text-[#e0e0ff]',
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] text-[#3a3a5c] uppercase tracking-widest font-medium">{label}</span>
      <span className={`text-sm sm:text-base font-bold tabular-nums leading-none ${color}`}>{value}</span>
      {sub && <span className="text-[8px] text-[#3a3a5c] tabular-nums">{sub}</span>}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function VDivider() {
  return <div className="w-px self-stretch bg-[#1a1a2e] shrink-0" />
}

// ─── BTC Stats Card (replaces PerformanceChart) ───────────────────────────────

export function PerformanceChart() {
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const marketAssets = useGameStore((s) => s.marketAssets)
  const btcLiveAt = useGameStore((s) => s.btcLiveAt)
  const startedAt = useGameStore((s) => s.startedAt)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const restartCount = useGameStore((s) => s.restartCount)

  const btc = marketAssets.find((a) => a.symbol === 'BTC')
  const equity = computeEquity(balance, openPositions)
  const pnlPct = computePnLPercent(balance, openPositions)
  const pnlDollar = computePnLDollar(balance, openPositions)
  const daysLive = computeDaysLive(startedAt)

  const isLive = btcLiveAt !== null
  const btcPrice = btc?.price ?? 0
  const btcMa30 = btc?.ma30 ?? 0
  const btcChange = btc?.change24h ?? 0
  const btcDev = btcMa30 > 0 ? ((btcPrice - btcMa30) / btcMa30) * 100 : 0

  const equityColor = equity >= 100_000 ? 'text-[#00ff41]' : 'text-[#ff3333]'
  const pnlColor = pnlPct >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
  const btcChangeColor = btcChange >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
  const devColor = btcDev >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'

  const totalVolume = tradeHistory.reduce((s, t) => s + t.dollarSize, 0)
  const btcPosition = openPositions.find((p) => p.asset === 'BTC')

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e]">
      {/* Top row: BTC live price bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a2e] overflow-x-auto">
        {/* LIVE badge */}
        {isLive ? (
          <span className="flex items-center gap-1.5 shrink-0 text-[9px] font-bold text-[#00ff41] border border-[#00ff41]/30 px-2 py-0.5 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="shrink-0 text-[9px] text-[#3a3a5c] border border-[#3a3a5c]/30 px-2 py-0.5 uppercase tracking-widest">
            SIM
          </span>
        )}

        {/* BTC price — large */}
        <span className="shrink-0 text-lg sm:text-xl font-bold tabular-nums text-[#e0e0ff] tracking-tight">
          ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>

        <span className={`shrink-0 text-xs font-bold tabular-nums ${btcChangeColor}`}>
          {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}% 24h
        </span>

        <VDivider />

        <span className="shrink-0 text-[9px] text-[#3a3a5c]">
          MA30 <span className="text-[#5a5a8a]">${btcMa30.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </span>

        <span className={`shrink-0 text-[9px] font-bold ${devColor}`}>
          {btcDev >= 0 ? '+' : ''}{btcDev.toFixed(2)}% vs MA
        </span>

        {/* Open BTC position pill */}
        {btcPosition && (
          <>
            <VDivider />
            <span className={`shrink-0 text-[9px] border px-2 py-0.5 ${btcPosition.unrealizedPnL >= 0 ? 'text-[#00ff41] border-[#00ff41]/30' : 'text-[#ff3333] border-[#ff3333]/30'}`}>
              LONG {btcPosition.quantity.toFixed(5)} BTC &nbsp;
              {btcPosition.unrealizedPnL >= 0 ? '+' : ''}${btcPosition.unrealizedPnL.toFixed(0)}
            </span>
          </>
        )}

        {isLive && (
          <span className="ml-auto shrink-0 text-[8px] text-[#2a2a4c]">Binance SPOT</span>
        )}
      </div>

      {/* Bottom row: portfolio stats */}
      <div className="flex items-center gap-0 divide-x divide-[#1a1a2e] overflow-x-auto">
        <div className="px-4 py-3 shrink-0">
          <Stat label="Equity" value={`$${equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color={equityColor} />
        </div>
        <div className="px-4 py-3 shrink-0">
          <Stat
            label="PnL"
            value={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
            sub={`${pnlDollar >= 0 ? '+' : ''}$${Math.abs(pnlDollar).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            color={pnlColor}
          />
        </div>
        <div className="px-4 py-3 shrink-0">
          <Stat label="Cash" value={`$${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color="text-[#e0e0ff]" />
        </div>
        <div className="px-4 py-3 shrink-0">
          <Stat label="Days Live" value={`${daysLive}d`} color="text-[#5a5a8a]" />
        </div>
        <div className="px-4 py-3 shrink-0">
          <Stat
            label="Volume"
            value={`$${(totalVolume / 1000).toFixed(0)}k`}
            color="text-[#5a5a8a]"
          />
        </div>
        {restartCount > 0 && (
          <div className="px-4 py-3 shrink-0">
            <Stat label="Liquidations" value={`×${restartCount}`} color="text-[#ff3333]" />
          </div>
        )}
      </div>
    </div>
  )
}
