import { NextRequest, NextResponse } from 'next/server'
import {
  callOpenRouter,
  callOpenRouterTrain,
  buildSystemPrompt,
  buildTradeMessages,
} from '@/lib/openrouter'
import type { TrainBotRequest, TrainBotResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

// ─── POST /api/train-bot ──────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<TrainBotResponse>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  // Validate optional claw-token header for OpenClaw bots
  // (For now we accept all requests; in production you'd verify against stored tokens)
  // const clawToken = request.headers.get('x-claw-token')

  let body: TrainBotRequest
  try {
    body = (await request.json()) as TrainBotRequest
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const { mode, customInstructions, priceHistory, currentBalance, openPositions, userMessage } = body

  // ── Training mode: user is configuring their bot ──────────────────────────
  if (mode === 'train') {
    if (!userMessage || userMessage.trim() === '') {
      return NextResponse.json(
        { error: 'userMessage is required for train mode.' },
        { status: 400 }
      )
    }

    try {
      const result = await callOpenRouterTrain(
        userMessage,
        customInstructions ?? [],
        apiKey
      )

      return NextResponse.json({
        styleSummary: result.styleSummary,
        acknowledgment: result.acknowledgment,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Train mode failed: ${message}` },
        { status: 502 }
      )
    }
  }

  // ── Trade mode: bot is requesting a trade decision ────────────────────────
  if (mode === 'trade') {
    const systemPrompt = buildSystemPrompt(
      customInstructions ?? [],
      currentBalance ?? 100_000,
      openPositions ?? []
    )

    const messages = buildTradeMessages(
      priceHistory ?? [],
      currentBalance ?? 100_000
    )

    try {
      const decision = await callOpenRouter(messages, systemPrompt, apiKey)
      return NextResponse.json({ decision })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Trade decision failed: ${message}` },
        { status: 502 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Invalid mode. Must be "trade" or "train".' },
    { status: 400 }
  )
}
