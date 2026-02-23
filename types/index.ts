// ─── Core Financial Types ────────────────────────────────────────────────────

export interface Position {
  id: string
  asset: string
  entryPrice: number
  currentPrice: number
  quantity: number
  side: 'long' | 'short'
  openedAt: number
  unrealizedPnL: number
  fee: number
}

export interface TradeRecord {
  id: string
  timestamp: number
  asset: string
  action: 'BUY' | 'SELL' | 'LIQUIDATION' | 'FEE'
  price: number
  quantity: number
  dollarSize: number
  fee: number
  pnl: number
  balanceAfter: number
  reasoning: string
  kellyPct: number
  quarterKellyPct: number
  w: number
  r: number
  botType: BotType
}

export interface TradeInput {
  asset: string
  action: 'BUY' | 'SELL'
  price: number
  w: number
  r: number
  reasoning: string
}

// ─── Kelly Criterion ──────────────────────────────────────────────────────────

export interface KellyResult {
  kellyPct: number
  quarterKellyPct: number
  dollarSize: number
}

// ─── AI / LLM Types ──────────────────────────────────────────────────────────

export interface AITradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD'
  asset: string
  reasoning: string
  w: number
  r: number
  styleSummary: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TrainBotRequest {
  mode: 'trade' | 'train'
  customInstructions: string[]
  priceHistory: PricePoint[]
  currentBalance: number
  openPositions: Position[]
  userMessage?: string
}

export interface TrainBotResponse {
  decision?: AITradeDecision
  styleSummary?: string
  acknowledgment?: string
  error?: string
}

// ─── Bot Types ────────────────────────────────────────────────────────────────

export type BotType = 'martingale' | 'ai' | 'openclaw'

// ─── Market Data ─────────────────────────────────────────────────────────────

export interface PricePoint {
  timestamp: number
  asset: string
  price: number
  volume?: number
}

export interface MarketAsset {
  symbol: string
  price: number
  change24h: number
  ma30: number
  priceHistory: number[]
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface EquityPoint {
  timestamp: number
  equity: number
}

export interface TickResult {
  newBalance: number
  newPositions: Position[]
  tradeExecuted: TradeRecord | null
  liquidationTriggered: boolean
  thoughtLog: ThoughtEntry
}

// ─── Thought Stream ───────────────────────────────────────────────────────────

export type ThoughtLevel = 'TRADE' | 'SYS' | 'WARN' | 'LIQUIDATION' | 'AI' | 'KELLY'

export interface ThoughtEntry {
  id: string
  timestamp: number
  level: ThoughtLevel
  message: string
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  ensName?: string
  botName: string          // OpenClaw bot name / style summary used as display name
  balance: number
  pnlDollar: number
  pnlPercent: number
  daysLive: number
  totalVolume: number      // total dollar volume traded (fees base)
  fees: number             // total fees paid (0.1% per trade)
  winRate: number          // % of SELL trades that were profitable
  biggestWin: number       // largest single realized profit ($)
  biggestLoss: number      // largest single realized loss ($ — stored as negative)
  tradeCount: number       // total number of trades executed
  styleSummary: string
  restartCount: number
  equityHistory: EquityPoint[]
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  updatedAt: number
}

// ─── Zustand Store Types ──────────────────────────────────────────────────────

export interface GameState {
  // Wallet
  walletAddress: string | null  // null = guest (unranked)
  guestId: string               // stable ID for guest session persistence

  // Financials
  balance: number
  openPositions: Position[]
  tradeHistory: TradeRecord[]
  restartCount: number

  // Bot Config
  activeBotType: BotType
  customInstructions: string[]
  styleSummary: string
  clawToken: string

  // Performance
  equityHistory: EquityPoint[]
  lastTickAt: number | null
  tickIntervalId: ReturnType<typeof setInterval> | null

  // Thought Stream
  thoughts: ThoughtEntry[]

  // Market Data (BTC live via Binance; others simulated)
  marketAssets: MarketAsset[]
  startedAt: number
  btcLiveAt: number | null  // timestamp of last successful Binance fetch

  // Actions
  setWallet: (address: string) => void
  clearWallet: () => void
  startTick: () => void
  stopTick: () => void
  executeTrade: (trade: TradeInput) => void
  triggerLiquidation: () => void
  addInstruction: (rule: string) => void
  removeInstruction: (index: number) => void
  setStyleSummary: (summary: string) => void
  setBotType: (type: BotType) => void
  addThought: (level: ThoughtLevel, message: string) => void
  calculateKellySize: (w: number, r: number) => KellyResult
  updateMarketPrices: () => void
  updateEquityHistory: () => void
  /** Replace BTC market asset with live Binance data */
  setBtcMarketData: (price: number, ma30: number, priceHistory: number[], change24h: number) => void
}

// ─── OpenClaw / Skill File ────────────────────────────────────────────────────

export interface OpenClawConfig {
  endpoint: string
  clawToken: string
  walletAddress: string
}

// ─── Engine Types ─────────────────────────────────────────────────────────────

export interface MartingaleState {
  lastSignalStrength: number
  consecutiveLosses: number
  basePositionSize: number
}
