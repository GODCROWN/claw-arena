import type {
  AITradeDecision,
  ChatMessage,
  Position,
  PricePoint,
} from '@/types'

// ─── OpenRouter API Configuration ────────────────────────────────────────────

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku'

// ─── Build system prompt ──────────────────────────────────────────────────────

export function buildSystemPrompt(
  customInstructions: string[],
  currentBalance: number,
  openPositions: Position[]
): string {
  const instructionsList =
    customInstructions.length > 0
      ? customInstructions.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '(none — use default conservative swing trading logic)'

  const positionsSummary =
    openPositions.length > 0
      ? openPositions
          .map(
            (p) =>
              `- ${p.asset}: ${p.quantity.toFixed(4)} units @ entry $${p.entryPrice.toFixed(2)}, current $${p.currentPrice.toFixed(2)}, PnL: $${p.unrealizedPnL.toFixed(2)}`
          )
          .join('\n')
      : '(none)'

  return `You are an AI trading bot for ClawArena — a competitive paper trading platform.
Your goal is to grow a virtual portfolio using swing trading (1–3 trades per day).

## Kelly Criterion (MANDATORY)
For every trade, you MUST estimate:
- W: Win probability (0.0–1.0) — your confidence this trade will be profitable
- R: Reward-to-Risk ratio — how much you expect to gain vs. lose (e.g. 1.5 means gain 1.5× your risk)

The platform will compute: Kelly% = W - [(1-W)/R], then use Quarter-Kelly (×0.25) for position sizing.

## Risk Rules
- NEVER risk more than 25% of balance on a single trade (enforced by Quarter-Kelly)
- Only 1–3 trades per day
- SELL if a position has been open >3 days or hit take-profit/stop-loss
- If portfolio equity < $90,000 → automatic liquidation and reset

## Custom Trading Rules (from user)
${instructionsList}

## Current Portfolio State
- Virtual Balance: $${currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
- Open Positions:
${positionsSummary}

## Response Format
You MUST respond with ONLY valid JSON matching this exact schema. No markdown, no explanation outside JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "asset": "BTC" | "ETH" | "SOL" | "ARB",
  "reasoning": "Brief explanation of the trade decision",
  "w": 0.65,
  "r": 1.8,
  "styleSummary": "Short 2-4 word style descriptor e.g. 'Aggressive Momentum Buyer'"
}

If action is "HOLD", set asset to the most relevant asset you're monitoring.
W must be between 0.1 and 0.9. R must be between 0.5 and 5.0.`
}

export function buildTrainSystemPrompt(customInstructions: string[]): string {
  const instructionsList =
    customInstructions.length > 0
      ? customInstructions.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '(none yet)'

  return `You are a trading coach for ClawArena. The user is configuring their AI trading bot.
When the user gives you a trading rule or strategy instruction, acknowledge it and summarize
the updated bot trading style in 3–5 words.

Current trading rules:
${instructionsList}

Respond with ONLY valid JSON:
{
  "styleSummary": "Updated 3-5 word style descriptor",
  "acknowledgment": "One sentence confirming the rule was understood and applied"
}`
}

// ─── Core OpenRouter Fetch Wrapper ────────────────────────────────────────────

interface OpenRouterRequestBody {
  model: string
  messages: ChatMessage[]
  response_format: { type: 'json_object' }
  temperature: number
  max_tokens: number
}

interface OpenRouterResponseBody {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

async function fetchOpenRouter(
  body: OpenRouterRequestBody,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'ClawArena Paper Trading',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as OpenRouterResponseBody

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenRouter returned empty content')
  }

  return content
}

// ─── Trade Decision ───────────────────────────────────────────────────────────

export async function callOpenRouter(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string
): Promise<AITradeDecision> {
  const allMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const content = await fetchOpenRouter(
    {
      model: DEFAULT_MODEL,
      messages: allMessages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 512,
    },
    apiKey
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse OpenRouter JSON response: ${content}`)
  }

  return validateAITradeDecision(parsed)
}

// ─── Training Mode ────────────────────────────────────────────────────────────

interface TrainResponse {
  styleSummary: string
  acknowledgment: string
}

export async function callOpenRouterTrain(
  userMessage: string,
  customInstructions: string[],
  apiKey: string
): Promise<TrainResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildTrainSystemPrompt(customInstructions) },
    { role: 'user', content: userMessage },
  ]

  const content = await fetchOpenRouter(
    {
      model: DEFAULT_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 256,
    },
    apiKey
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse train response JSON: ${content}`)
  }

  return validateTrainResponse(parsed)
}

// ─── Build trade messages from price history ──────────────────────────────────

export function buildTradeMessages(
  priceHistory: PricePoint[],
  currentBalance: number
): ChatMessage[] {
  const recentPrices = priceHistory.slice(-10)
  const priceContext = recentPrices
    .map(
      (p) =>
        `${p.asset} @ $${p.price.toFixed(2)} (${new Date(p.timestamp).toISOString().slice(11, 16)} UTC)`
    )
    .join(', ')

  return [
    {
      role: 'user',
      content: `Current market snapshot: ${priceContext || 'No recent price data'}\nCurrent balance: $${currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}. What is your trade decision?`,
    },
  ]
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateAITradeDecision(raw: unknown): AITradeDecision {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('AI response is not an object')
  }

  const obj = raw as Record<string, unknown>

  const action = obj['action']
  if (action !== 'BUY' && action !== 'SELL' && action !== 'HOLD') {
    throw new Error(`Invalid action: ${String(action)}`)
  }

  const asset = typeof obj['asset'] === 'string' ? obj['asset'] : 'BTC'
  const reasoning =
    typeof obj['reasoning'] === 'string' ? obj['reasoning'] : 'No reasoning provided'
  const styleSummary =
    typeof obj['styleSummary'] === 'string'
      ? obj['styleSummary']
      : 'Adaptive Trader'

  const w = clamp(typeof obj['w'] === 'number' ? obj['w'] : 0.55, 0.1, 0.9)
  const r = clamp(typeof obj['r'] === 'number' ? obj['r'] : 1.5, 0.5, 5.0)

  return { action, asset, reasoning, w, r, styleSummary }
}

function validateTrainResponse(raw: unknown): TrainResponse {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Train response is not an object')
  }

  const obj = raw as Record<string, unknown>

  return {
    styleSummary:
      typeof obj['styleSummary'] === 'string'
        ? obj['styleSummary']
        : 'Custom Strategy',
    acknowledgment:
      typeof obj['acknowledgment'] === 'string'
        ? obj['acknowledgment']
        : 'Rule acknowledged.',
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
