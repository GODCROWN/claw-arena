'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { calculateKellySize as kellyCalc, formatKellyLog } from '@/lib/kelly'
import type {
  GameState,
  Position,
  TradeInput,
  TradeRecord,
  KellyResult,
  ThoughtLevel,
  ThoughtEntry,
  MarketAsset,
  EquityPoint,
  BotType,
} from '@/types'

// ─── Simulated market assets with realistic starting prices ──────────────────

const INITIAL_ASSETS: MarketAsset[] = [
  {
    symbol: 'BTC',
    price: 67_450,
    change24h: 0,
    ma30: 65_200,
    priceHistory: Array.from({ length: 30 }, (_, i) =>
      65_200 + Math.sin(i * 0.4) * 3000 + Math.random() * 2000
    ),
  },
]

// ─── Helper: simulate realistic price movement ────────────────────────────────

function simulatePriceMove(asset: MarketAsset): MarketAsset {
  const volatility = 0.008 // 0.8% max move per tick
  const drift = (Math.random() - 0.495) * volatility
  const newPrice = Math.max(0.01, asset.price * (1 + drift))
  const change24h = ((newPrice - asset.ma30) / asset.ma30) * 100

  const newHistory = [...asset.priceHistory.slice(-29), newPrice]
  const ma30 = newHistory.reduce((a, b) => a + b, 0) / newHistory.length

  return {
    ...asset,
    price: newPrice,
    change24h,
    ma30,
    priceHistory: newHistory,
  }
}

// ─── Helper: calculate total equity ──────────────────────────────────────────

function calcTotalEquity(balance: number, positions: Position[]): number {
  const unrealized = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0)
  return balance + unrealized
}

// ─── Helper: update unrealized P&L for open positions ────────────────────────

function refreshPositionPnL(
  positions: Position[],
  assets: MarketAsset[]
): Position[] {
  return positions.map((pos) => {
    const asset = assets.find((a) => a.symbol === pos.asset)
    if (!asset) return pos
    const currentPrice = asset.price
    const pnl =
      pos.side === 'long'
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity
    return { ...pos, currentPrice, unrealizedPnL: pnl }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ── Wallet (null = guest; set to EVM address when wallet connects) ───────
      walletAddress: null,
      guestId: `guest_${uuidv4().slice(0, 8)}`,

      // ── Financials ──────────────────────────────────────────────────────────
      balance: 100_000,
      openPositions: [],
      tradeHistory: [],
      restartCount: 0,

      // ── Bot Config ──────────────────────────────────────────────────────────
      activeBotType: 'martingale' as BotType,
      customInstructions: [],
      styleSummary: 'Awaiting Calibration',
      clawToken: uuidv4(),

      // ── Performance ─────────────────────────────────────────────────────────
      equityHistory: [{ timestamp: Date.now(), equity: 100_000 }],
      lastTickAt: null,
      tickIntervalId: null,

      // ── Thought Stream ───────────────────────────────────────────────────────
      thoughts: [
        {
          id: uuidv4(),
          timestamp: Date.now(),
          level: 'SYS',
          message: 'ClawArena engine initialized. Trading as guest — connect wallet to join the global leaderboard.',
        },
      ],

      // ── Market Data ─────────────────────────────────────────────────────────
      marketAssets: INITIAL_ASSETS,
      startedAt: Date.now(), // start immediately — no wallet required
      btcLiveAt: null,       // null until first successful Binance fetch

      // ── Actions ─────────────────────────────────────────────────────────────

      setWallet: (address) => {
        const existing = get().walletAddress
        if (existing === address) return

        // Preserve startedAt if already playing as guest
        const wasGuest = existing === null
        set({
          walletAddress: address,
          startedAt: wasGuest ? (get().startedAt ?? Date.now()) : Date.now(),
        })
        get().addThought(
          'SYS',
          wasGuest
            ? `Wallet connected: ${address.slice(0, 6)}…${address.slice(-4)} — guest session upgraded to ranked.`
            : `Wallet switched: ${address.slice(0, 6)}…${address.slice(-4)}`
        )
      },

      clearWallet: () => {
        // Don't stop ticking — guest mode continues after disconnect
        set({ walletAddress: null })
        get().addThought('SYS', 'Wallet disconnected. Continuing as guest (unranked).')
      },

      startTick: () => {
        const state = get()
        if (state.tickIntervalId) return // already running

        const id = setInterval(() => {
          // Dynamic import to avoid circular dep at module init time
          import('@/lib/engine').then(({ runEvaluationTick }) => {
            runEvaluationTick()
          })
        }, 15 * 60 * 1000) // 15 minutes

        set({ tickIntervalId: id })
        get().addThought('SYS', 'Evaluation tick engine started (15 min interval).')
      },

      stopTick: () => {
        const { tickIntervalId } = get()
        if (tickIntervalId) {
          clearInterval(tickIntervalId)
          set({ tickIntervalId: null })
          get().addThought('SYS', 'Tick engine stopped.')
        }
      },

      executeTrade: (trade: TradeInput) => {
        const state = get()
        const { balance, openPositions, tradeHistory, marketAssets } = state

        const asset = marketAssets.find((a) => a.symbol === trade.asset)
        const price = asset?.price ?? trade.price

        const kelly = kellyCalc(trade.w, trade.r, balance)
        const dollarSize = Math.min(kelly.dollarSize, balance * 0.95)
        const quantity = dollarSize / price
        const fee = dollarSize * 0.001 // 0.1% fee

        // Log Kelly math first
        const kellyLog = formatKellyLog(trade.w, trade.r, kelly)
        get().addThought('KELLY', `[SYS]: ${kellyLog}`)

        if (trade.action === 'BUY') {
          const newBalance = balance - dollarSize - fee
          if (newBalance < 0) {
            get().addThought('WARN', `Insufficient balance for BUY ${trade.asset}. Skipping.`)
            return
          }

          const position: Position = {
            id: uuidv4(),
            asset: trade.asset,
            entryPrice: price,
            currentPrice: price,
            quantity,
            side: 'long',
            openedAt: Date.now(),
            unrealizedPnL: 0,
            fee,
          }

          const record: TradeRecord = {
            id: uuidv4(),
            timestamp: Date.now(),
            asset: trade.asset,
            action: 'BUY',
            price,
            quantity,
            dollarSize,
            fee,
            pnl: 0,
            balanceAfter: newBalance,
            reasoning: trade.reasoning,
            kellyPct: kelly.kellyPct,
            quarterKellyPct: kelly.quarterKellyPct,
            w: trade.w,
            r: trade.r,
            botType: state.activeBotType,
          }

          set({
            balance: newBalance,
            openPositions: [...openPositions, position],
            tradeHistory: [record, ...tradeHistory].slice(0, 500),
          })

          get().addThought(
            'TRADE',
            `[TRADE] BUY ${quantity.toFixed(4)} ${trade.asset} @ $${price.toFixed(2)} | Size: $${dollarSize.toFixed(0)} | Fee: $${fee.toFixed(2)}`
          )

        } else if (trade.action === 'SELL') {
          // Find matching long position to close
          const posIdx = openPositions.findIndex(
            (p) => p.asset === trade.asset && p.side === 'long'
          )

          if (posIdx === -1) {
            get().addThought('WARN', `No open position for SELL ${trade.asset}. Skipping.`)
            return
          }

          const pos = openPositions[posIdx]
          const realizedPnL = (price - pos.entryPrice) * pos.quantity
          const proceeds = pos.quantity * price
          const sellFee = proceeds * 0.001
          const newBalance = balance + proceeds - sellFee

          const record: TradeRecord = {
            id: uuidv4(),
            timestamp: Date.now(),
            asset: trade.asset,
            action: 'SELL',
            price,
            quantity: pos.quantity,
            dollarSize: proceeds,
            fee: sellFee,
            pnl: realizedPnL,
            balanceAfter: newBalance,
            reasoning: trade.reasoning,
            kellyPct: kelly.kellyPct,
            quarterKellyPct: kelly.quarterKellyPct,
            w: trade.w,
            r: trade.r,
            botType: state.activeBotType,
          }

          const remaining = openPositions.filter((_, i) => i !== posIdx)

          set({
            balance: newBalance,
            openPositions: remaining,
            tradeHistory: [record, ...tradeHistory].slice(0, 500),
          })

          const pnlStr = realizedPnL >= 0
            ? `+$${realizedPnL.toFixed(2)}`
            : `-$${Math.abs(realizedPnL).toFixed(2)}`

          get().addThought(
            'TRADE',
            `[TRADE] SELL ${pos.quantity.toFixed(4)} ${trade.asset} @ $${price.toFixed(2)} | PnL: ${pnlStr} | Fee: $${sellFee.toFixed(2)}`
          )
        }

        get().updateEquityHistory()
      },

      triggerLiquidation: () => {
        const state = get()
        const equity = calcTotalEquity(state.balance, state.openPositions)

        const record: TradeRecord = {
          id: uuidv4(),
          timestamp: Date.now(),
          asset: 'PORTFOLIO',
          action: 'LIQUIDATION',
          price: 0,
          quantity: 0,
          dollarSize: equity,
          fee: 0,
          pnl: equity - 100_000,
          balanceAfter: 100_000,
          reasoning: `Portfolio equity dropped to $${equity.toFixed(0)} — below 90% threshold.`,
          kellyPct: 0,
          quarterKellyPct: 0,
          w: 0,
          r: 0,
          botType: state.activeBotType,
        }

        set({
          balance: 100_000,
          openPositions: [],
          restartCount: state.restartCount + 1,
          tradeHistory: [record, ...state.tradeHistory].slice(0, 500),
        })

        get().addThought(
          'LIQUIDATION',
          `[LIQUIDATION] Portfolio equity $${equity.toFixed(0)} < $90,000. RESET. Restart #${state.restartCount + 1}`
        )

        get().updateEquityHistory()
      },

      addInstruction: (rule) => {
        const { customInstructions } = get()
        set({ customInstructions: [...customInstructions, rule] })
        get().addThought('SYS', `New trading rule added: "${rule}"`)
      },

      removeInstruction: (index) => {
        const { customInstructions } = get()
        const updated = customInstructions.filter((_, i) => i !== index)
        set({ customInstructions: updated })
      },

      setStyleSummary: (summary) => {
        set({ styleSummary: summary })
        get().addThought('AI', `Bot style calibrated: "${summary}"`)
      },

      setBotType: (type: BotType) => {
        set({ activeBotType: type })
        get().addThought('SYS', `Bot type switched to: ${type.toUpperCase()}`)
      },

      addThought: (level: ThoughtLevel, message: string) => {
        const entry: ThoughtEntry = {
          id: uuidv4(),
          timestamp: Date.now(),
          level,
          message,
        }
        set((state) => ({
          thoughts: [...state.thoughts, entry].slice(-200), // max 200 entries
        }))
      },

      calculateKellySize: (w: number, r: number): KellyResult => {
        const { balance } = get()
        return kellyCalc(w, r, balance)
      },

      updateMarketPrices: () => {
        set((state) => {
          // BTC price is set live via setBtcMarketData — skip simulation for BTC
          const updatedAssets = state.marketAssets.map((asset) =>
            asset.symbol === 'BTC' ? asset : simulatePriceMove(asset)
          )
          const updatedPositions = refreshPositionPnL(
            state.openPositions,
            updatedAssets
          )
          return {
            marketAssets: updatedAssets,
            openPositions: updatedPositions,
          }
        })
      },

      updateEquityHistory: () => {
        const state = get()
        const equity = calcTotalEquity(state.balance, state.openPositions)
        const point: EquityPoint = { timestamp: Date.now(), equity }
        set((s) => ({
          equityHistory: [...s.equityHistory, point].slice(-2016), // ~30 days at 15-min ticks
        }))
      },

      setBtcMarketData: (price, ma30, priceHistory, change24h) => {
        set((state) => {
          const updatedAssets = state.marketAssets.map((asset) => {
            if (asset.symbol !== 'BTC') return asset
            return {
              ...asset,
              price,
              ma30,
              priceHistory,
              change24h,
            }
          })
          // Refresh unrealized P&L for any open BTC positions
          const updatedPositions = refreshPositionPnL(state.openPositions, updatedAssets)
          return {
            marketAssets: updatedAssets,
            openPositions: updatedPositions,
            btcLiveAt: Date.now(),
          }
        })
      },
    }),
    {
      name: 'claw-arena-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        guestId: state.guestId,
        balance: state.balance,
        openPositions: state.openPositions,
        tradeHistory: state.tradeHistory,
        restartCount: state.restartCount,
        activeBotType: state.activeBotType,
        customInstructions: state.customInstructions,
        styleSummary: state.styleSummary,
        clawToken: state.clawToken,
        equityHistory: state.equityHistory,
        lastTickAt: state.lastTickAt,
        thoughts: state.thoughts,
        marketAssets: state.marketAssets,
        startedAt: state.startedAt,
        btcLiveAt: state.btcLiveAt,
      }),
    }
  )
)

// ─── Derived selectors (accept full GameState — use with useGameStore.getState()) ──

export function selectTotalEquity(state: GameState): number {
  return calcTotalEquity(state.balance, state.openPositions)
}

export function selectPnLPercent(state: GameState): number {
  const equity = calcTotalEquity(state.balance, state.openPositions)
  return ((equity - 100_000) / 100_000) * 100
}

export function selectPnLDollar(state: GameState): number {
  return calcTotalEquity(state.balance, state.openPositions) - 100_000
}

export function selectDaysLive(state: GameState): number {
  if (!state.startedAt) return 0
  return Math.floor((Date.now() - state.startedAt) / (1000 * 60 * 60 * 24))
}

export function selectTotalVolume(state: GameState): number {
  return state.tradeHistory.reduce((sum, t) => sum + t.dollarSize, 0)
}

// ─── Pure computation helpers (no GameState dependency) ──────────────────────

export function computeEquity(balance: number, openPositions: Position[]): number {
  return calcTotalEquity(balance, openPositions)
}

export function computePnLPercent(balance: number, openPositions: Position[]): number {
  const equity = calcTotalEquity(balance, openPositions)
  return ((equity - 100_000) / 100_000) * 100
}

export function computePnLDollar(balance: number, openPositions: Position[]): number {
  return calcTotalEquity(balance, openPositions) - 100_000
}

export function computeDaysLive(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / (1000 * 60 * 60 * 24))
}

export function computeTotalVolume(tradeHistory: TradeRecord[]): number {
  return tradeHistory.reduce((sum, t) => sum + t.dollarSize, 0)
}
