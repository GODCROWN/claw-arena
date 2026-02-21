'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useEffect } from 'react'
import { useGameStore, computeEquity, computePnLPercent } from '@/store/useGameStore'
import { Activity, Skull, Zap } from 'lucide-react'

// ─── ASCII Logo ───────────────────────────────────────────────────────────────

function ClawLogo() {
  return (
    <div className="flex flex-col leading-none select-none">
      <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">
        ╔═╗╦  ╔═╗╦ ╦
      </span>
      <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">
        ║  ║  ╠═╣║║║
      </span>
      <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">
        ╚═╝╩═╝╩ ╩╚╩╝
      </span>
      <span className="text-[8px] text-[#3a3a5c] tracking-[0.5em] mt-0.5">
        ARENA v0.1
      </span>
    </div>
  )
}

// ─── Balance Display ──────────────────────────────────────────────────────────

function BalanceDisplay() {
  const balance = useGameStore((s) => s.balance)
  const openPositions = useGameStore((s) => s.openPositions)
  const restartCount = useGameStore((s) => s.restartCount)

  const equity = computeEquity(balance, openPositions)
  const pnlPct = computePnLPercent(balance, openPositions)

  const isProfit = equity > 100_000
  const isDanger = equity < 90_000

  const equityColor = isDanger
    ? 'text-[#ff3333] glow-red'
    : isProfit
    ? 'text-[#00ff41] glow-green'
    : 'text-[#e0e0ff]'

  const pnlColor = pnlPct >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-2">
        <Activity size={12} className="text-[#3a3a5c]" />
        <span className="text-[10px] text-[#5a5a8a] tracking-widest uppercase">
          Virtual Equity
        </span>
        {isDanger && (
          <span className="text-[9px] text-[#ff3333] liquidation-blink font-bold">
            ⚠ DANGER
          </span>
        )}
      </div>
      <div className={`text-xl font-bold tabular-nums tracking-tight ${equityColor}`}>
        ${equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium tabular-nums ${pnlColor}`}>
          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
        </span>
        {restartCount > 0 && (
          <div className="flex items-center gap-1">
            <Skull size={10} className="text-[#ff3333]" />
            <span className="text-[10px] text-[#ff3333]">×{restartCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bot Style Badge ──────────────────────────────────────────────────────────

function BotStyleBadge() {
  const styleSummary = useGameStore((s) => s.styleSummary)
  const activeBotType = useGameStore((s) => s.activeBotType)
  const lastTickAt = useGameStore((s) => s.lastTickAt)
  const walletAddress = useGameStore((s) => s.walletAddress)

  const botTypeColor = {
    martingale: 'text-[#ffd700] border-[#ffd700]/30 bg-[#ffd700]/5',
    ai: 'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/5',
    openclaw: 'text-[#a855f7] border-[#a855f7]/30 bg-[#a855f7]/5',
  }[activeBotType]

  const botLabel = {
    martingale: 'MARTINGALE',
    ai: 'AI BOT',
    openclaw: 'OPENCLAW',
  }[activeBotType]

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {!walletAddress && (
          <span className="text-[8px] text-[#3a3a5c] border border-[#3a3a5c]/30 px-1 py-0.5 uppercase tracking-widest">
            GUEST
          </span>
        )}
        <div className={`px-2 py-0.5 border text-[9px] font-bold tracking-widest uppercase ${botTypeColor}`}>
          <Zap size={8} className="inline mr-1" />
          {botLabel}
        </div>
      </div>
      <div className="text-[10px] text-[#5a5a8a] text-right max-w-[160px] truncate">
        {styleSummary}
      </div>
      {lastTickAt && (
        <div className="text-[9px] text-[#3a3a5c]">
          Last tick: {new Date(lastTickAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

// ─── Wallet Sync ──────────────────────────────────────────────────────────────

// Syncs the wagmi wallet connection state into the game store.
// Wallet is optional — guests can trade without connecting.
function WalletSync() {
  const { address, isConnected } = useAccount()
  const setWallet = useGameStore((s) => s.setWallet)
  const clearWallet = useGameStore((s) => s.clearWallet)
  const walletAddress = useGameStore((s) => s.walletAddress)

  useEffect(() => {
    if (isConnected && address && address !== walletAddress) {
      // Upgrade guest session → ranked session
      setWallet(address)
    } else if (!isConnected && walletAddress) {
      // Downgrade back to guest; ticking continues uninterrupted
      clearWallet()
    }
  }, [isConnected, address, walletAddress, setWallet, clearWallet])

  return null
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export function ArenaHeader() {
  return (
    <>
      <WalletSync />
      <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#0a0a0f]/95 backdrop-blur-sm">
        {/* Top scan line effect */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent" />

        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <ClawLogo />

          {/* Balance */}
          <BalanceDisplay />

          {/* Right: Bot badge + Connect */}
          <div className="flex items-center gap-4">
            <BotStyleBadge />
            <div className="border border-[#1a1a2e]">
              <ConnectButton
                accountStatus="avatar"
                chainStatus="none"
                showBalance={false}
              />
            </div>
          </div>
        </div>

        {/* Bottom scan line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff41]/10 to-transparent" />
      </header>
    </>
  )
}
