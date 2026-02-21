'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useGameStore, computeEquity } from '@/store/useGameStore'
import type { EquityPoint, LeaderboardResponse } from '@/types'

// ─── Chart data point ─────────────────────────────────────────────────────────

interface ChartPoint {
  time: string
  userEquity: number
  topEquity: number | null
}

// ─── Format timestamp to short date/time ──────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diffMs = now - ts
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 1) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e] px-3 py-2 text-xs font-mono">
      <p className="text-[#5a5a8a] mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="tabular-nums" style={{ color: entry.color }}>
            ${entry.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Merge user equity with top bot equity ────────────────────────────────────

function buildChartData(
  userHistory: EquityPoint[],
  topHistory: EquityPoint[]
): ChartPoint[] {
  // Downsample to max 96 points for readability
  const downsample = <T,>(arr: T[], max: number): T[] => {
    if (arr.length <= max) return arr
    const step = Math.floor(arr.length / max)
    return arr.filter((_, i) => i % step === 0)
  }

  const userPoints = downsample(userHistory.slice(-2016), 96)

  return userPoints.map((point, i) => {
    const topPoint = topHistory[Math.floor((i / userPoints.length) * topHistory.length)]
    return {
      time: formatTime(point.timestamp),
      userEquity: Math.round(point.equity),
      topEquity: topPoint ? Math.round(topPoint.equity) : null,
    }
  })
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-[#5a5a8a] uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

// ─── Main chart component ─────────────────────────────────────────────────────

export function PerformanceChart() {
  const equityHistory = useGameStore((s) => s.equityHistory)
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const [topHistory, setTopHistory] = useState<EquityPoint[]>([])

  const currentEquity = computeEquity(balance, openPositions)
  const pnl = currentEquity - 100_000
  const pnlPct = (pnl / 100_000) * 100

  // Fetch top bot equity
  useEffect(() => {
    async function fetchTop() {
      try {
        const res = await fetch('/api/leaderboard?top=1')
        if (!res.ok) return
        const data = (await res.json()) as LeaderboardResponse
        if (data.entries.length > 0) {
          setTopHistory(data.entries[0].equityHistory)
        }
      } catch {
        // Silently fail — chart still shows user data
      }
    }

    fetchTop()
    const interval = setInterval(fetchTop, 60_000)
    return () => clearInterval(interval)
  }, [])

  const chartData = buildChartData(equityHistory, topHistory)

  const minEquity = Math.min(
    ...chartData.map((d) => d.userEquity),
    ...chartData.filter((d) => d.topEquity !== null).map((d) => d.topEquity as number)
  )
  const yMin = Math.max(0, Math.floor((minEquity - 5000) / 10000) * 10000)

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e] p-4">
      {/* Header — stacks on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xs font-bold text-[#e0e0ff] tracking-widest uppercase">
            Performance Chart
          </h2>
          <p className="text-[9px] text-[#3a3a5c] mt-0.5">
            Equity curve vs. global #1
          </p>
        </div>

        {/* Stats: 3 across on sm+, scrollable on xs */}
        <div className="flex gap-3 sm:gap-6 overflow-x-auto pb-1 md:pb-0">
          <StatBadge
            label="Equity"
            value={`$${currentEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            color={currentEquity >= 100_000 ? 'text-[#00ff41]' : 'text-[#ff3333]'}
          />
          <StatBadge
            label="PnL"
            value={`${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            color={pnl >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'}
          />
          <StatBadge
            label="Return"
            value={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
            color={pnlPct >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px bg-[#00ff41]" />
          <span className="text-[9px] text-[#5a5a8a]">Your Bot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px bg-[#ff6b00]" />
          <span className="text-[9px] text-[#5a5a8a]">Global #1</span>
        </div>
      </div>

      {/* Chart — shorter on mobile */}
      <div className="h-40 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid
              strokeDasharray="1 4"
              stroke="#1a1a2e"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#3a3a5c', fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1a1a2e' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#3a3a5c', fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              domain={[yMin, 'auto']}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={100_000}
              stroke="#1a1a2e"
              strokeDasharray="4 4"
              label={{ value: 'Start', fill: '#3a3a5c', fontSize: 9 }}
            />
            <ReferenceLine
              y={90_000}
              stroke="#ff3333"
              strokeDasharray="2 4"
              strokeOpacity={0.4}
              label={{ value: 'Liq.', fill: '#ff3333', fontSize: 9 }}
            />
            <Line
              type="monotone"
              dataKey="userEquity"
              name="Your Bot"
              stroke="#00ff41"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#00ff41' }}
            />
            <Line
              type="monotone"
              dataKey="topEquity"
              name="Global #1"
              stroke="#ff6b00"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: '#ff6b00' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
