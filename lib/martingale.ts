import { deriveWinRate, deriveRewardRisk } from '@/lib/kelly'
import type { MarketAsset, TradeRecord, TradeInput } from '@/types'

// ─── Martingale Bot Configuration ────────────────────────────────────────────

const MA_DEVIATION_BUY_THRESHOLD = 0.02  // 2% below MA → BUY signal
const MA_DEVIATION_SELL_THRESHOLD = 0.02 // 2% above MA → SELL signal
const LOOKBACK_TRADES = 20               // number of trades for W/R derivation

// ─── Signal Types ─────────────────────────────────────────────────────────────

export type MartingaleSignal = 'BUY' | 'SELL' | 'HOLD'

export interface MartingaleAnalysis {
  signal: MartingaleSignal
  asset: string
  deviationPct: number
  w: number
  r: number
  reasoning: string
}

// ─── Derive dynamic W and R from trade history ────────────────────────────────

function getDynamicWR(
  tradeHistory: TradeRecord[]
): { w: number; r: number } {
  const recentTrades = tradeHistory
    .filter((t) => t.action === 'SELL')
    .slice(0, LOOKBACK_TRADES)

  const outcomes = recentTrades.map((t) => t.pnl > 0)
  const w = deriveWinRate(outcomes)
  const r = deriveRewardRisk(
    recentTrades.map((t) => ({ pnl: t.pnl, dollarSize: t.dollarSize }))
  )

  return { w, r }
}

// ─── Main martingale analysis function ───────────────────────────────────────

export function analyzeMartingale(
  marketAssets: MarketAsset[],
  tradeHistory: TradeRecord[],
  openPositionAssets: string[]
): MartingaleAnalysis {
  const { w, r } = getDynamicWR(tradeHistory)

  // Find the asset with the strongest signal
  let bestSignal: MartingaleSignal = 'HOLD'
  let bestAsset = marketAssets[0]?.symbol ?? 'BTC'
  let bestDeviation = 0

  for (const asset of marketAssets) {
    const deviation = (asset.price - asset.ma30) / asset.ma30
    const hasPosition = openPositionAssets.includes(asset.symbol)

    if (!hasPosition && deviation < -MA_DEVIATION_BUY_THRESHOLD) {
      // Price is sufficiently below MA — BUY signal
      if (Math.abs(deviation) > Math.abs(bestDeviation)) {
        bestSignal = 'BUY'
        bestAsset = asset.symbol
        bestDeviation = deviation
      }
    } else if (hasPosition && deviation > MA_DEVIATION_SELL_THRESHOLD) {
      // Price is sufficiently above MA — SELL signal
      if (Math.abs(deviation) > Math.abs(bestDeviation)) {
        bestSignal = 'SELL'
        bestAsset = asset.symbol
        bestDeviation = deviation
      }
    }
  }

  const deviationPct = bestDeviation * 100

  let reasoning: string
  if (bestSignal === 'BUY') {
    reasoning = `${bestAsset} is ${Math.abs(deviationPct).toFixed(2)}% below 30-day MA ($${marketAssets.find((a) => a.symbol === bestAsset)?.ma30.toFixed(2) ?? '?'}). Mean-reversion BUY signal. W=${w.toFixed(2)}, R=${r.toFixed(2)}.`
  } else if (bestSignal === 'SELL') {
    reasoning = `${bestAsset} is ${Math.abs(deviationPct).toFixed(2)}% above 30-day MA ($${marketAssets.find((a) => a.symbol === bestAsset)?.ma30.toFixed(2) ?? '?'}). Take-profit SELL signal. W=${w.toFixed(2)}, R=${r.toFixed(2)}.`
  } else {
    reasoning = `All assets within MA deviation bands. No actionable signal. Holding. W=${w.toFixed(2)}, R=${r.toFixed(2)}.`
  }

  return { signal: bestSignal, asset: bestAsset, deviationPct, w, r, reasoning }
}

// ─── Convert MartingaleAnalysis to TradeInput ─────────────────────────────────

export function martingaleToTradeInput(
  analysis: MartingaleAnalysis
): TradeInput | null {
  if (analysis.signal === 'HOLD') return null

  return {
    asset: analysis.asset,
    action: analysis.signal,
    price: 0, // engine will resolve current price from store
    w: analysis.w,
    r: analysis.r,
    reasoning: analysis.reasoning,
  }
}
