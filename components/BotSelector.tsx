'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { Bot, Cpu, ExternalLink, Wifi, WifiOff, Download, Copy, Check } from 'lucide-react'
import type { BotType } from '@/types'

// ─── Bot option card ──────────────────────────────────────────────────────────

interface BotCardProps {
  type: BotType
  label: string
  description: string
  active: boolean
  onSelect: () => void
  badge?: string
  badgeColor?: string
}

function BotCard({
  type,
  label,
  description,
  active,
  onSelect,
  badge,
  badgeColor = 'text-[#5a5a8a] border-[#1a1a2e]',
}: BotCardProps) {
  const icons: Record<BotType, React.ReactNode> = {
    martingale: <Cpu size={14} />,
    ai: <Bot size={14} />,
    openclaw: <ExternalLink size={14} />,
  }

  const activeColors: Record<BotType, string> = {
    martingale: 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/5',
    ai: 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/5',
    openclaw: 'border-[#a855f7] text-[#a855f7] bg-[#a855f7]/5',
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 min-h-[52px] border transition-all ${
        active
          ? activeColors[type]
          : 'border-[#1a1a2e] text-[#5a5a8a] hover:border-[#3a3a5c] hover:text-[#e0e0ff]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icons[type]}
          <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
        {badge && (
          <span className={`text-[8px] border px-1.5 py-0.5 uppercase tracking-widest ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[9px] opacity-60 leading-relaxed">{description}</p>
    </button>
  )
}

// ─── OpenClaw config panel ────────────────────────────────────────────────────

function OpenClawPanel() {
  const walletAddress = useGameStore((s) => s.walletAddress)
  const clawToken = useGameStore((s) => s.clawToken)
  const addThought = useGameStore((s) => s.addThought)
  const [healthStatus, setHealthStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [copied, setCopied] = useState(false)

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

  const skillContent = `# ClawArena Bot Skill
## Endpoint
POST ${appUrl}/api/train-bot

## Required Output
JSON matching AITradeDecision schema:
{
  "action": "BUY" | "SELL" | "HOLD",
  "asset": "BTC",
  "reasoning": "Brief explanation",
  "w": 0.65,
  "r": 1.8,
  "styleSummary": "Your Bot Style"
}

## Auth
Header: x-claw-token: ${clawToken}
Wallet: ${walletAddress ?? 'NOT_CONNECTED'}

## Context
The platform sends POST body:
{
  "mode": "trade",
  "customInstructions": [],
  "priceHistory": [{ "timestamp": number, "asset": "BTC", "price": number }],
  "currentBalance": number,
  "openPositions": [Position]
}

## Notes
- Only BTC/USD spot trading is supported
- Respond ONLY with valid JSON (no markdown wrapping)
- W must be 0.1–0.9, R must be 0.5–5.0
- Kelly Criterion is applied server-side for position sizing
- asset field must always be "BTC"
`

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health')
        setHealthStatus(res.ok ? 'online' : 'offline')
      } catch {
        setHealthStatus('offline')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10_000)
    return () => clearInterval(interval)
  }, [])

  const handleDownload = () => {
    const blob = new Blob([skillContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CLAW_SKILL.md'
    a.click()
    URL.revokeObjectURL(url)
    addThought('SYS', 'CLAW_SKILL.md downloaded. Configure your self-hosted LLM to trade BTC.')
  }

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(clawToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  return (
    <div className="mt-3 p-3 bg-[#0a0a0f] border border-[#a855f7]/20 text-[10px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#a855f7] font-bold uppercase tracking-widest text-[9px]">
          OpenClaw Configuration
        </span>
        <div className="flex items-center gap-1.5">
          {healthStatus === 'online' ? (
            <Wifi size={10} className="text-[#00ff41]" />
          ) : healthStatus === 'offline' ? (
            <WifiOff size={10} className="text-[#ff3333]" />
          ) : (
            <Wifi size={10} className="text-[#5a5a8a] animate-pulse" />
          )}
          <span
            className={
              healthStatus === 'online'
                ? 'text-[#00ff41]'
                : healthStatus === 'offline'
                ? 'text-[#ff3333]'
                : 'text-[#5a5a8a]'
            }
          >
            {healthStatus === 'checking' ? 'Checking...' : healthStatus}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-[#5a5a8a] mb-1">Endpoint</p>
          <code className="text-[#00d4ff] text-[9px] break-all">
            POST {appUrl}/api/train-bot
          </code>
        </div>

        <div>
          <p className="text-[#5a5a8a] mb-1">Auth Token</p>
          <div className="flex items-center gap-2">
            <code className="text-[#a855f7] text-[9px] truncate flex-1">
              {clawToken.slice(0, 20)}…
            </code>
            <button
              onClick={handleCopyToken}
              className="p-2 -m-2 text-[#3a3a5c] hover:text-[#a855f7] transition-colors shrink-0"
              aria-label="Copy token"
            >
              {copied ? <Check size={10} className="text-[#00ff41]" /> : <Copy size={10} />}
            </button>
          </div>
        </div>

        <div className="text-[8px] text-[#3a3a5c] leading-relaxed">
          <span className="text-[#5a5a8a]">Asset:</span> BTC/USD Spot only
        </div>

        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-1.5 border border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10 transition-colors text-[9px] uppercase tracking-widest min-h-[44px] sm:min-h-0"
        >
          <Download size={10} />
          Download CLAW_SKILL.md
        </button>
      </div>
    </div>
  )
}

// ─── BTC Market Snapshot ───────────────────────────────────────────────────────

function BtcSnapshot() {
  const assets = useGameStore((s) => s.marketAssets)
  const btcLiveAt = useGameStore((s) => s.btcLiveAt)

  const btc = assets.find((a) => a.symbol === 'BTC')
  if (!btc) return null

  const isLive = btcLiveAt !== null
  const deviation = btc.ma30 > 0 ? ((btc.price - btc.ma30) / btc.ma30) * 100 : 0
  const devColor = deviation >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'
  const changeColor = btc.change24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'

  return (
    <div className="mt-3 border border-[#1a1a2e] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest">
          BTC/USD Market
        </p>
        {isLive ? (
          <span className="flex items-center gap-1 text-[8px] text-[#00ff41]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse inline-block" />
            LIVE
          </span>
        ) : (
          <span className="text-[8px] text-[#3a3a5c]">SIM</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-[#5a5a8a]">Price</span>
          <span className="text-sm font-bold tabular-nums text-[#e0e0ff]">
            ${btc.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-[#5a5a8a]">24h Change</span>
          <span className={`text-[10px] font-bold tabular-nums ${changeColor}`}>
            {btc.change24h >= 0 ? '+' : ''}{btc.change24h.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-[#5a5a8a]">MA30</span>
          <span className="text-[10px] tabular-nums text-[#5a5a8a]">
            ${btc.ma30.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-[#5a5a8a]">vs MA30</span>
          <span className={`text-[10px] font-bold tabular-nums ${devColor}`}>
            {deviation >= 0 ? '+' : ''}{deviation.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main BotSelector component ───────────────────────────────────────────────

export function BotSelector() {
  const activeBotType = useGameStore((s) => s.activeBotType)
  const setBotType = useGameStore((s) => s.setBotType)

  return (
    <div className="bg-[#0f0f1a] border border-[#1a1a2e] p-4">
      <h3 className="text-[9px] text-[#5a5a8a] uppercase tracking-widest mb-3 font-bold">
        Bot Configuration
      </h3>

      <div className="space-y-1.5">
        <BotCard
          type="openclaw"
          label="OpenClaw"
          description="Connect your own self-hosted LLM. Download SKILL.md and configure it to POST to the arena endpoint. Trades BTC/USD spot."
          active={activeBotType === 'openclaw'}
          onSelect={() => setBotType('openclaw')}
          badge="Recommended"
          badgeColor="text-[#a855f7] border-[#a855f7]/30"
        />

        <BotCard
          type="martingale"
          label="Martingale"
          description="Mean-reversion strategy using 30-day MA deviation signals. Win rate & R auto-calculated from BTC trade history."
          active={activeBotType === 'martingale'}
          onSelect={() => setBotType('martingale')}
          badge="Local"
          badgeColor="text-[#ffd700] border-[#ffd700]/30"
        />

        <BotCard
          type="ai"
          label="AI Bot"
          description="OpenRouter LLM (Claude Haiku) makes trade decisions based on your custom rules. Train via Command Console."
          active={activeBotType === 'ai'}
          onSelect={() => setBotType('ai')}
          badge="OpenRouter"
          badgeColor="text-[#00d4ff] border-[#00d4ff]/30"
        />
      </div>

      {activeBotType === 'openclaw' && <OpenClawPanel />}

      <BtcSnapshot />
    </div>
  )
}
