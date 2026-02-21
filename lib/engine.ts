/**
 * Core Evaluation Tick Engine
 *
 * This module implements the 15-minute evaluation loop that:
 * 1. Updates simulated market prices
 * 2. Checks liquidation threshold (equity < $90,000)
 * 3. Dispatches trade logic to the active bot type
 * 4. Records equity snapshots for the performance chart
 *
 * NOTE: This module is imported dynamically from useGameStore to avoid
 * circular dependency at module initialization time.
 */

import { analyzeMartingale, martingaleToTradeInput } from '@/lib/martingale'
import { useGameStore, selectTotalEquity } from '@/store/useGameStore'
import type { PricePoint } from '@/types'

// ─── Liquidation threshold ─────────────────────────────────────────────────

const LIQUIDATION_THRESHOLD = 90_000

// ─── Build price history snapshot for AI ─────────────────────────────────────

function buildPriceHistory(): PricePoint[] {
  const { marketAssets } = useGameStore.getState()
  const now = Date.now()

  return marketAssets.flatMap((asset) =>
    asset.priceHistory.slice(-5).map((price, i) => ({
      timestamp: now - (5 - i) * 15 * 60 * 1000,
      asset: asset.symbol,
      price,
    }))
  )
}

// ─── AI Bot tick: calls the server-side API ───────────────────────────────────

async function runAITick(): Promise<void> {
  const state = useGameStore.getState()

  const priceHistory = buildPriceHistory()

  let response: Response
  try {
    response = await fetch('/api/train-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'trade',
        customInstructions: state.customInstructions,
        priceHistory,
        currentBalance: state.balance,
        openPositions: state.openPositions,
      }),
    })
  } catch (err) {
    state.addThought('WARN', `AI tick network error: ${String(err)}`)
    return
  }

  if (!response.ok) {
    state.addThought('WARN', `AI tick HTTP error: ${response.status}`)
    return
  }

  let data: { decision?: { action: string; asset: string; reasoning: string; w: number; r: number; styleSummary: string } }
  try {
    data = await response.json() as typeof data
  } catch {
    state.addThought('WARN', 'AI tick: failed to parse response JSON.')
    return
  }

  const decision = data.decision
  if (!decision) {
    state.addThought('SYS', 'AI tick: HOLD — no trade signal returned.')
    return
  }

  if (decision.styleSummary) {
    state.setStyleSummary(decision.styleSummary)
  }

  if (decision.action === 'HOLD') {
    state.addThought('AI', `[AI] HOLD — ${decision.reasoning}`)
    return
  }

  if (decision.action === 'BUY' || decision.action === 'SELL') {
    const currentAsset = state.marketAssets.find(
      (a) => a.symbol === decision.asset
    )

    state.executeTrade({
      asset: decision.asset,
      action: decision.action,
      price: currentAsset?.price ?? 0,
      w: decision.w,
      r: decision.r,
      reasoning: decision.reasoning,
    })
  }
}

// ─── Martingale Bot tick ──────────────────────────────────────────────────────

function runMartingaleTick(): void {
  const state = useGameStore.getState()

  const openPositionAssets = state.openPositions.map((p) => p.asset)

  const analysis = analyzeMartingale(
    state.marketAssets,
    state.tradeHistory,
    openPositionAssets
  )

  state.addThought(
    'SYS',
    `[MARTINGALE] ${analysis.signal} signal — ${analysis.reasoning}`
  )

  if (analysis.signal === 'HOLD') return

  const tradeInput = martingaleToTradeInput(analysis)
  if (!tradeInput) return

  // Resolve current price from store
  const asset = state.marketAssets.find((a) => a.symbol === tradeInput.asset)
  tradeInput.price = asset?.price ?? 0

  state.executeTrade(tradeInput)
}

// ─── OpenClaw Bot tick: external bot handles trades ───────────────────────────

function runOpenClawTick(): void {
  const state = useGameStore.getState()
  state.addThought(
    'SYS',
    '[OPENCLAW] Awaiting external bot signal via /api/train-bot...'
  )
  // OpenClaw bots connect externally; the platform just waits for inbound POST
}

// ─── Main evaluation tick ─────────────────────────────────────────────────────

export async function runEvaluationTick(): Promise<void> {
  const store = useGameStore.getState()

  // 1. Update simulated market prices
  store.updateMarketPrices()

  // 2. Recalculate equity after price move
  const equity = selectTotalEquity(useGameStore.getState())

  store.addThought(
    'SYS',
    `Tick fired. Equity: $${equity.toLocaleString('en-US', { maximumFractionDigits: 0 })} | Balance: $${store.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  )

  // 3. Liquidation check
  if (equity < LIQUIDATION_THRESHOLD) {
    store.triggerLiquidation()
    return
  }

  // 4. Dispatch to active bot
  switch (store.activeBotType) {
    case 'martingale':
      runMartingaleTick()
      break
    case 'ai':
      await runAITick()
      break
    case 'openclaw':
      runOpenClawTick()
      break
  }

  // 5. Update equity history snapshot
  store.updateEquityHistory()

  // 6. Update last tick timestamp
  useGameStore.setState({ lastTickAt: Date.now() })
}
