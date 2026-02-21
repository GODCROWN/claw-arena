'use client'

import { useGameStore } from '@/store/useGameStore'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'

export function PositionsPanel() {
  const openPositions = useGameStore((s) => s.openPositions)
  const tradeHistory = useGameStore((s) => s.tradeHistory)
  const balance = useGameStore((s) => s.balance)

  const recentTrades = tradeHistory
    .filter((t) => t.action === 'BUY' || t.action === 'SELL')
    .slice(0, 8)

  const totalUnrealized = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0)

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e] p-4 space-y-4">
      {/* Balance overview */}
      <div>
        <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">Portfolio</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-2">
            <p className="text-[8px] text-[#3a3a5c]">Cash</p>
            <p className="text-xs tabular-nums text-[#e0e0ff] font-bold">
              ${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-2">
            <p className="text-[8px] text-[#3a3a5c]">Unrealized</p>
            <p
              className={`text-xs tabular-nums font-bold ${
                totalUnrealized >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
              }`}
            >
              {totalUnrealized >= 0 ? '+' : ''}$
              {Math.abs(totalUnrealized).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a2e] p-2">
            <p className="text-[8px] text-[#3a3a5c]">Positions</p>
            <p className="text-xs tabular-nums text-[#00d4ff] font-bold">
              {openPositions.length} open
            </p>
          </div>
        </div>
      </div>

      {/* Open positions */}
      {openPositions.length > 0 && (
        <div>
          <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">
            Open Positions
          </p>
          <div className="space-y-1">
            {openPositions.map((pos) => {
              const pnlColor = pos.unrealizedPnL >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
              const pnlPct =
                ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100

              return (
                <div
                  key={pos.id}
                  className="flex flex-col xs:flex-row xs:items-center justify-between bg-[#0a0a0f] border border-[#1a1a2e] px-2 py-2 text-[10px] gap-1"
                >
                  <div className="flex items-center gap-2">
                    {pos.unrealizedPnL >= 0 ? (
                      <TrendingUp size={10} className="text-[#00ff41]" />
                    ) : (
                      <TrendingDown size={10} className="text-[#ff3333]" />
                    )}
                    <span className="font-bold text-[#e0e0ff]">{pos.asset}</span>
                    <span className="text-[#3a3a5c] truncate">
                      {pos.quantity.toFixed(4)} @ ${pos.entryPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-5 xs:pl-0">
                    <span className="text-[#5a5a8a] tabular-nums">
                      ${pos.currentPrice.toFixed(2)}
                    </span>
                    <span className={`tabular-nums font-bold ${pnlColor}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent trades */}
      <div>
        <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-2">
          Recent Trades
        </p>

        {recentTrades.length === 0 ? (
          <p className="text-[9px] text-[#3a3a5c] italic">No trades executed yet.</p>
        ) : (
          <div className="space-y-0.5">
            {recentTrades.map((trade) => {
              const isBuy = trade.action === 'BUY'
              const pnlColor =
                trade.pnl > 0
                  ? 'text-[#00ff41]'
                  : trade.pnl < 0
                  ? 'text-[#ff3333]'
                  : 'text-[#5a5a8a]'

              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between text-[9px] py-1.5 sm:py-0.5 px-1 hover:bg-[#0a0a0f] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={8} className="text-[#3a3a5c] shrink-0" />
                    <span
                      className={`font-bold w-7 ${
                        isBuy ? 'text-[#00ff41]' : 'text-[#ff3333]'
                      }`}
                    >
                      {trade.action}
                    </span>
                    <span className="text-[#e0e0ff]">{trade.asset}</span>
                    <span className="text-[#3a3a5c]">
                      @ ${trade.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {trade.action === 'SELL' && (
                      <span className={`tabular-nums ${pnlColor}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                      </span>
                    )}
                    <span className="text-[#3a3a5c]">
                      {new Date(trade.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
