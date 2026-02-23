import { NextRequest, NextResponse } from 'next/server'
import type { LeaderboardResponse, LeaderboardEntry, EquityPoint } from '@/types'

export const runtime = 'nodejs'

// ─── In-memory leaderboard store ─────────────────────────────────────────────

interface LeaderboardRecord {
  walletAddress: string
  botName: string
  balance: number
  pnlDollar: number
  pnlPercent: number
  startedAt: number
  totalVolume: number
  fees: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  tradeCount: number
  styleSummary: string
  restartCount: number
  equityHistory: EquityPoint[]
  updatedAt: number
}

const leaderboardStore = new Map<string, LeaderboardRecord>()

// ─── Helper: generate mock equity history ─────────────────────────────────────

function generateMockEquity(start: number, end: number, days: number): EquityPoint[] {
  const points: EquityPoint[] = []
  const now = Date.now()
  const tickCount = days * 24 * 4

  for (let i = 0; i <= tickCount; i++) {
    const progress = i / tickCount
    const noise = (Math.random() - 0.5) * 3000
    points.push({
      timestamp: now - (tickCount - i) * 15 * 60 * 1000,
      equity: Math.max(85_000, start + (end - start) * progress + noise),
    })
  }
  return points
}

// ─── Seed demo entries ────────────────────────────────────────────────────────

const MOCK_ENTRIES: LeaderboardRecord[] = [
  {
    walletAddress: '0xdemo0000000000000000000000000000000000001',
    botName: 'SatoshiScalper-v3',
    balance: 147_320,
    pnlDollar: 47_320,
    pnlPercent: 47.32,
    startedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    totalVolume: 1_243_000,
    fees: 1_243,
    winRate: 63.2,
    biggestWin: 12_400,
    biggestLoss: -4_200,
    tradeCount: 158,
    styleSummary: 'Aggressive Momentum Hunter',
    restartCount: 0,
    equityHistory: generateMockEquity(100_000, 147_320, 25),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000002',
    botName: 'MeanRevertBot-Pro',
    balance: 128_900,
    pnlDollar: 28_900,
    pnlPercent: 28.9,
    startedAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    totalVolume: 876_500,
    fees: 876,
    winRate: 58.4,
    biggestWin: 8_100,
    biggestLoss: -2_900,
    tradeCount: 94,
    styleSummary: 'Conservative Dip Buyer',
    restartCount: 1,
    equityHistory: generateMockEquity(100_000, 128_900, 18),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000003',
    botName: 'HAL9000-BTC',
    balance: 93_400,
    pnlDollar: -6_600,
    pnlPercent: -6.6,
    startedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    totalVolume: 432_200,
    fees: 432,
    winRate: 34.0,
    biggestWin: 3_200,
    biggestLoss: -7_800,
    tradeCount: 67,
    styleSummary: 'Mean Reversion Scalper',
    restartCount: 2,
    equityHistory: generateMockEquity(100_000, 93_400, 10),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000004',
    botName: 'TrendRiderX',
    balance: 112_750,
    pnlDollar: 12_750,
    pnlPercent: 12.75,
    startedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    totalVolume: 654_000,
    fees: 654,
    winRate: 51.3,
    biggestWin: 6_500,
    biggestLoss: -3_100,
    tradeCount: 117,
    styleSummary: 'Trend Follower',
    restartCount: 0,
    equityHistory: generateMockEquity(100_000, 112_750, 14),
    updatedAt: Date.now(),
  },
]

MOCK_ENTRIES.forEach((e) => leaderboardStore.set(e.walletAddress, e))

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<LeaderboardResponse>> {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('top') ?? '100', 10), 100)

  const allEntries = Array.from(leaderboardStore.values())
  allEntries.sort((a, b) => b.pnlPercent - a.pnlPercent)

  const entries: LeaderboardEntry[] = allEntries.slice(0, limit).map((record, idx) => ({
    rank: idx + 1,
    walletAddress: record.walletAddress,
    botName: record.botName || record.styleSummary || 'Unnamed Bot',
    balance: record.balance,
    pnlDollar: record.pnlDollar,
    pnlPercent: record.pnlPercent,
    daysLive: Math.floor((Date.now() - record.startedAt) / (1000 * 60 * 60 * 24)),
    totalVolume: record.totalVolume,
    fees: record.fees,
    winRate: record.winRate,
    biggestWin: record.biggestWin,
    biggestLoss: record.biggestLoss,
    tradeCount: record.tradeCount,
    styleSummary: record.styleSummary,
    restartCount: record.restartCount,
    equityHistory: record.equityHistory.slice(-96),
  }))

  return NextResponse.json({ entries, updatedAt: Date.now() })
}

// ─── POST /api/leaderboard ────────────────────────────────────────────────────

interface LeaderboardSubmitBody {
  walletAddress: string
  botName?: string
  balance: number
  pnlDollar: number
  pnlPercent: number
  startedAt: number
  totalVolume: number
  fees?: number
  winRate?: number
  biggestWin?: number
  biggestLoss?: number
  tradeCount?: number
  styleSummary: string
  restartCount: number
  equityHistory: EquityPoint[]
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  let body: LeaderboardSubmitBody
  try {
    body = (await request.json()) as LeaderboardSubmitBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.walletAddress || typeof body.walletAddress !== 'string') {
    return NextResponse.json({ success: false, error: 'walletAddress is required' }, { status: 400 })
  }

  leaderboardStore.set(body.walletAddress, {
    walletAddress: body.walletAddress,
    botName: body.botName || body.styleSummary || 'Unnamed Bot',
    balance: body.balance,
    pnlDollar: body.pnlDollar,
    pnlPercent: body.pnlPercent,
    startedAt: body.startedAt,
    totalVolume: body.totalVolume,
    fees: body.fees ?? body.totalVolume * 0.001,
    winRate: body.winRate ?? 0,
    biggestWin: body.biggestWin ?? 0,
    biggestLoss: body.biggestLoss ?? 0,
    tradeCount: body.tradeCount ?? 0,
    styleSummary: body.styleSummary,
    restartCount: body.restartCount,
    equityHistory: body.equityHistory,
    updatedAt: Date.now(),
  })

  return NextResponse.json({ success: true })
}
