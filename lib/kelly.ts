import type { KellyResult } from '@/types'

/**
 * Kelly Criterion position sizing calculator.
 *
 * Formula:
 *   Kelly%       = W - [(1 - W) / R]
 *   Quarter-Kelly = Kelly% × 0.25   (floored at 0)
 *   Dollar Size  = balance × Quarter-Kelly%
 *
 * @param w       Win probability (0–1)
 * @param r       Reward-to-Risk ratio (e.g. 1.5 means you win 1.5× your risk)
 * @param balance Current virtual cash balance
 */
export function calculateKellySize(
  w: number,
  r: number,
  balance: number
): KellyResult {
  if (r <= 0) {
    return { kellyPct: 0, quarterKellyPct: 0, dollarSize: 0 }
  }

  const kellyPct = w - (1 - w) / r
  const quarterKellyPct = Math.max(0, kellyPct * 0.25)
  const dollarSize = balance * quarterKellyPct

  return {
    kellyPct,
    quarterKellyPct,
    dollarSize,
  }
}

/**
 * Formats a Kelly calculation result into the canonical ThoughtStream log line.
 *
 * Example output:
 *   [SYS]: W=0.60, R=1.50 → Kelly=33.3% → Quarter-Kelly=8.3% → Size=$8,300
 */
export function formatKellyLog(
  w: number,
  r: number,
  result: KellyResult
): string {
  const kellyDisplay = (result.kellyPct * 100).toFixed(1)
  const qkDisplay = (result.quarterKellyPct * 100).toFixed(1)
  const sizeDisplay = result.dollarSize.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  return `W=${w.toFixed(2)}, R=${r.toFixed(2)} → Kelly=${kellyDisplay}% → Quarter-Kelly=${qkDisplay}% → Size=${sizeDisplay}`
}

/**
 * Derives W (win rate) from a list of boolean outcomes.
 * Returns a default of 0.5 when no history exists.
 */
export function deriveWinRate(outcomes: boolean[]): number {
  if (outcomes.length === 0) return 0.5
  const wins = outcomes.filter(Boolean).length
  return wins / outcomes.length
}

/**
 * Derives R (reward-to-risk ratio) from a list of { gain, loss } trade records.
 * Both gain and loss should be positive numbers representing absolute values.
 * Returns 1.0 as a neutral default when insufficient data.
 */
export function deriveRewardRisk(
  trades: { pnl: number; dollarSize: number }[]
): number {
  const closedTrades = trades.filter((t) => t.pnl !== 0 && t.dollarSize > 0)
  if (closedTrades.length < 2) return 1.0

  const winners = closedTrades.filter((t) => t.pnl > 0)
  const losers = closedTrades.filter((t) => t.pnl < 0)

  if (winners.length === 0 || losers.length === 0) return 1.0

  const avgWin =
    winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length
  const avgLoss =
    Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / losers.length

  if (avgLoss === 0) return 1.0

  return avgWin / avgLoss
}
