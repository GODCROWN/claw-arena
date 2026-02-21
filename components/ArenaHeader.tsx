'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useEffect } from 'react'
import { useGameStore, computeEquity, computePnLPercent } from '@/store/useGameStore'
import { Activity, Skull, Zap } from 'lucide-react'

// ─── Live BTC Ticker ──────────────────────────────────────────────────────────

function BtcTicker() {
  const marketAssets = useGameStore((s) => s.marketAssets)
  const btcLiveAt = useGameStore((s) => s.btcLiveAt)

  const btc = marketAssets.find((a) => a.symbol === 'BTC')
  if (!btc) return null

  const isLive = btcLiveAt !== null
  const changeColor = btc.change24h >= 0 ? 'text-[#00ff41]' : 'text-[#ff3333]'

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 md:px-6 py-1 border-b border-[#1a1a2e] bg-[#0a0a0f]/80 text-[9px] overflow-x-auto">
      {/* LIVE / SIM badge */}
      {isLive ? (
        <span className="flex items-center gap-1 shrink-0 text-[#00ff41] border border-[#00ff41]/30 px-1.5 py-0.5 uppercase tracking-widest font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse inline-block" />
          LIVE
        </span>
      ) : (
        <span className="shrink-0 text-[#3a3a5c] border border-[#3a3a5c]/30 px-1.5 py-0.5 uppercase tracking-widest">
          SIM
        </span>
      )}

      {/* BTC price */}
      <span className="shrink-0 text-[#e0e0ff] font-bold tabular-nums">
        BTC/USDT ${btc.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      {/* 24h change */}
      <span className={`shrink-0 tabular-nums ${changeColor}`}>
        {btc.change24h >= 0 ? '+' : ''}{btc.change24h.toFixed(2)}%
      </span>

      {/* MA30 */}
      <span className="shrink-0 text-[#3a3a5c]">
        MA30 ${btc.ma30.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>

      {/* Binance attribution */}
      {isLive && (
        <span className="shrink-0 text-[#2a2a4c] ml-auto">
          via Binance SPOT
        </span>
      )}
    </div>
  )
}

// ─── ASCII Logo (hidden on smallest screens, replaced with text mark) ─────────

function ClawLogo() {
  return (
    <div className="flex flex-col leading-none select-none shrink-0">
      {/* Full ASCII art on md+ */}
      <div className="hidden md:flex flex-col">
        <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">╔═╗╦  ╔═╗╦ ╦</span>
        <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">║  ║  ╠═╣║║║</span>
        <span className="text-[10px] text-[#00ff41] font-bold tracking-[0.3em] glow-green">╚═╝╩═╝╩ ╩╚╩╝</span>
        <span className="text-[8px] text-[#3a3a5c] tracking-[0.5em] mt-0.5">ARENA v0.1</span>
      </div>
      {/* Compact wordmark on mobile */}
      <div className="flex md:hidden flex-col">
        <span className="text-sm font-bold text-[#00ff41] tracking-widest glow-green">⬡ CLAW</span>
        <span className="text-[9px] text-[#3a3a5c] tracking-widest">ARENA</span>
      </div>
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
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      {/* Label row — hidden on very small screens */}
      <div className="hidden sm:flex items-center gap-2">
        <Activity size={10} className="text-[#3a3a5c]" />
        <span className="text-[9px] text-[#5a5a8a] tracking-widest uppercase">
          Equity
        </span>
        {isDanger && (
          <span className="text-[9px] text-[#ff3333] liquidation-blink font-bold">
            ⚠ DANGER
          </span>
        )}
      </div>

      {/* Equity value */}
      <div className={`text-base sm:text-xl font-bold tabular-nums tracking-tight truncate ${equityColor}`}>
        ${equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>

      {/* PnL + restarts */}
      <div className="flex items-center gap-2">
        {isDanger && (
          <span className="sm:hidden text-[9px] text-[#ff3333] liquidation-blink font-bold">⚠</span>
        )}
        <span className={`text-[10px] sm:text-xs font-medium tabular-nums ${pnlColor}`}>
          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
        </span>
        {restartCount > 0 && (
          <div className="flex items-center gap-0.5">
            <Skull size={9} className="text-[#ff3333]" />
            <span className="text-[9px] text-[#ff3333]">×{restartCount}</span>
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
    martingale: 'MTG',        // Abbreviated for mobile
    ai: 'AI',
    openclaw: 'OCL',
  }[activeBotType]

  const botLabelFull = {
    martingale: 'MARTINGALE',
    ai: 'AI BOT',
    openclaw: 'OPENCLAW',
  }[activeBotType]

  return (
    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-1.5">
        {!walletAddress && (
          <span className="text-[8px] text-[#3a3a5c] border border-[#3a3a5c]/30 px-1 py-0.5 uppercase tracking-widest">
            GUEST
          </span>
        )}
        <div className={`px-2 py-0.5 border text-[9px] font-bold tracking-widest uppercase ${botTypeColor}`}>
          <Zap size={8} className="inline mr-1" />
          {/* Short label on sm, full on md+ */}
          <span className="sm:hidden">{botLabel}</span>
          <span className="hidden sm:inline">{botLabelFull}</span>
        </div>
      </div>
      <div className="text-[9px] text-[#5a5a8a] text-right max-w-[100px] md:max-w-[160px] truncate">
        {styleSummary}
      </div>
      {lastTickAt && (
        <div className="hidden md:block text-[9px] text-[#3a3a5c]">
          Last tick: {new Date(lastTickAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

// ─── Wallet Sync ──────────────────────────────────────────────────────────────

function WalletSync() {
  const { address, isConnected } = useAccount()
  const setWallet = useGameStore((s) => s.setWallet)
  const clearWallet = useGameStore((s) => s.clearWallet)
  const walletAddress = useGameStore((s) => s.walletAddress)

  useEffect(() => {
    if (isConnected && address && address !== walletAddress) {
      setWallet(address)
    } else if (!isConnected && walletAddress) {
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
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent" />

        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 md:px-6">
          {/* Logo */}
          <ClawLogo />

          {/* Balance — always visible, centered */}
          <BalanceDisplay />

          {/* Right: Bot badge + Connect */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff41]/10 to-transparent" />

        {/* Live BTC ticker strip */}
        <BtcTicker />
      </header>
    </>
  )
}
