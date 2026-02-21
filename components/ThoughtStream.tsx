'use client'

import { useEffect, useRef, memo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { Terminal } from 'lucide-react'
import type { ThoughtEntry, ThoughtLevel } from '@/types'

// ─── Level color mapping ──────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  ThoughtLevel,
  { color: string; prefix: string; extraClass?: string }
> = {
  TRADE: {
    color: 'text-[#00ff41]',
    prefix: '[TRADE]',
  },
  SYS: {
    color: 'text-[#00d4ff]',
    prefix: '[SYS]',
  },
  WARN: {
    color: 'text-[#ffd700]',
    prefix: '[WARN]',
  },
  LIQUIDATION: {
    color: 'text-[#ff3333]',
    prefix: '[LIQUIDATION]',
    extraClass: 'liquidation-blink font-bold',
  },
  AI: {
    color: 'text-[#a855f7]',
    prefix: '[AI]',
  },
  KELLY: {
    color: 'text-[#00d4ff]',
    prefix: '[KELLY]',
  },
}

// ─── Single thought entry row ─────────────────────────────────────────────────

const ThoughtRow = memo(function ThoughtRow({ entry }: { entry: ThoughtEntry }) {
  const config = LEVEL_CONFIG[entry.level]
  const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  // Strip redundant prefix from message if already included
  const message = entry.message.startsWith(`[${entry.level}]`)
    ? entry.message.slice(`[${entry.level}]`.length).trim()
    : entry.message

  return (
    <div
      className={`flex gap-2 py-0.5 px-2 hover:bg-[#0f0f1a] transition-colors text-[11px] leading-relaxed ${config.extraClass ?? ''}`}
    >
      <span className="text-[#3a3a5c] shrink-0 tabular-nums">{timeStr}</span>
      <span className={`shrink-0 font-bold ${config.color}`}>
        {config.prefix}
      </span>
      <span className={`${config.color} opacity-80 break-all`}>{message}</span>
    </div>
  )
})

// ─── Main ThoughtStream ───────────────────────────────────────────────────────

export function ThoughtStream() {
  const thoughts = useGameStore((s) => s.thoughts)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef(false)

  // Track if user has scrolled up manually
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isUserScrolledUp.current = distFromBottom > 40
  }

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!isUserScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thoughts])

  const tradeCount = thoughts.filter((t) => t.level === 'TRADE').length
  const warnCount = thoughts.filter((t) => t.level === 'WARN' || t.level === 'LIQUIDATION').length

  return (
    <div className="bg-[#0a0a0f] border border-[#1a1a2e] flex flex-col h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a2e] shrink-0 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <Terminal size={12} className="text-[#00d4ff]" />
          <span className="text-[9px] text-[#e0e0ff] uppercase tracking-widest font-bold">
            Thought Stream
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
        </div>
        <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-[9px] text-[#3a3a5c]">
          <span>
            <span className="text-[#00ff41]">{tradeCount}</span> trades
          </span>
          {warnCount > 0 && (
            <span>
              <span className="text-[#ffd700]">{warnCount}</span> alerts
            </span>
          )}
          <span className="hidden sm:inline">{thoughts.length}/200 entries</span>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono"
      >
        {thoughts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[10px] text-[#3a3a5c]">
            Awaiting first signal...
          </div>
        ) : (
          thoughts.map((entry) => (
            <ThoughtRow key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
