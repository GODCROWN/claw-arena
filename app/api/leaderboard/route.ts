import { NextRequest, NextResponse } from 'next/server'
import type { LeaderboardResponse, LeaderboardEntry, EquityPoint } from '@/types'

export const runtime = 'nodejs'

// ─── In-memory leaderboard store ─────────────────────────────────────────────
// In production, replace with a database (Postgres, Redis, etc.)
// For now we store submitted entries in module-level memory.

interface LeaderboardRecord {
  walletAddress: string
  balance: number
  pnlDollar: number
  pnlPercent: number
  startedAt: number
  totalVolume: number
  styleSummary: string
  restartCount: number
  equityHistory: EquityPoint[]
  updatedAt: number
}

const leaderboardStore = new Map<string, LeaderboardRecord>()

// Seed with some mock entries for demo purposes
const MOCK_ENTRIES: LeaderboardRecord[] = [
  {
    walletAddress: '0xdemo0000000000000000000000000000000000001',
    balance: 147_320,
    pnlDollar: 47_320,
    pnlPercent: 47.32,
    startedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    totalVolume: 1_243_000,
    styleSummary: 'Aggressive Momentum Hunter',
    restartCount: 0,
    equityHistory: generateMockEquity(100_000, 147_320, 25),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000002',
    balance: 128_900,
    pnlDollar: 28_900,
    pnlPercent: 28.9,
    startedAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    totalVolume: 876_500,
    styleSummary: 'Conservative Dip Buyer',
    restartCount: 1,
    equityHistory: generateMockEquity(100_000, 128_900, 18),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000003',
    balance: 93_400,
    pnlDollar: -6_600,
    pnlPercent: -6.6,
    startedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    totalVolume: 432_200,
    styleSummary: 'Mean Reversion Scalper',
    restartCount: 2,
    equityHistory: generateMockEquity(100_000, 93_400, 10),
    updatedAt: Date.now(),
  },
  {
    walletAddress: '0xdemo0000000000000000000000000000000000004',
    balance: 112_750,
    pnlDollar: 12_750,
    pnlPercent: 12.75,
    startedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    totalVolume: 654_000,
    styleSummary: 'Trend Follower',
    restartCount: 0,
    equityHistory: generateMockEquity(100_000, 112_750, 14),
    updatedAt: Date.now(),
  },
]

MOCK_ENTRIES.forEach((e) => leaderboardStore.set(e.walletAddress, e))

// ─── Helper: generate mock equity history ─────────────────────────────────────

function generateMockEquity(
  start: number,
  end: number,
  days: number
): EquityPoint[] {
  const points: EquityPoint[] = []
  const now = Date.now()
  const tickCount = days * 24 * 4 // 15-min ticks

  for (let i = 0; i <= tickCount; i++) {
    const progress = i / tickCount
    const noise = (Math.random() - 0.5) * 3000
    const equity = start + (end - start) * progress + noise
    points.push({
      timestamp: now - (tickCount - i) * 15 * 60 * 1000,
      equity: Math.max(85_000, equity),
    })
  }

  return points
}

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<LeaderboardResponse>> {
  const { searchParams } = new URL(request.url)
  const topParam = searchParams.get('top')
  const limit = topParam ? parseInt(topParam, 10) : 50

  const allEntries = Array.from(leaderboardStore.values())

  // Sort by PnL% descending
  allEntries.sort((a, b) => b.pnlPercent - a.pnlPercent)

  const entries: LeaderboardEntry[] = allEntries
    .slice(0, Math.min(limit, 100))
    .map((record, idx) => ({
      rank: idx + 1,
      walletAddress: record.walletAddress,
      balance: record.balance,
      pnlDollar: record.pnlDollar,
      pnlPercent: record.pnlPercent,
      daysLive: Math.floor(
        (Date.now() - record.startedAt) / (1000 * 60 * 60 * 24)
      ),
      totalVolume: record.totalVolume,
      styleSummary: record.styleSummary,
      restartCount: record.restartCount,
      equityHistory: record.equityHistory.slice(-96), // last 24h
    }))

  return NextResponse.json({
    entries,
    updatedAt: Date.now(),
  })
}

// ─── POST /api/leaderboard — submit/update user entry ────────────────────────

interface LeaderboardSubmitBody {
  walletAddress: string
  balance: number
  pnlDollar: number
  pnlPercent: number
  startedAt: number
  totalVolume: number
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
    return NextResponse.json(
      { success: false, error: 'walletAddress is required' },
      { status: 400 }
    )
  }

  leaderboardStore.set(body.walletAddress, {
    ...body,
    updatedAt: Date.now(),
  })

  return NextResponse.json({ success: true })
}
