/**
 * Binance Public REST API client — no API key required for public market data.
 *
 * Endpoints used:
 *   GET /api/v3/ticker/price?symbol=BTCUSDT  → latest spot price
 *   GET /api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30 → daily OHLCV (for MA30)
 *
 * All requests go through our own /api/market/btc Next.js route to avoid
 * CORS issues when calling from the browser.
 */

export interface BinanceTicker {
  symbol: string
  price: number
}

export interface BinanceKline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

// ─── Raw Binance kline tuple ──────────────────────────────────────────────────
// [openTime, open, high, low, close, volume, closeTime, ...]
type RawKline = [
  number,  // openTime
  string,  // open
  string,  // high
  string,  // low
  string,  // close
  string,  // volume
  number,  // closeTime
  ...unknown[]
]

const BINANCE_BASE = 'https://api.binance.com'

// ─── Fetch current BTC/USDT spot price ───────────────────────────────────────

export async function fetchBtcSpotPrice(): Promise<number> {
  const res = await fetch(
    `${BINANCE_BASE}/api/v3/ticker/price?symbol=BTCUSDT`,
    { next: { revalidate: 0 } } // always fresh
  )
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`)
  const data = await res.json() as { symbol: string; price: string }
  return parseFloat(data.price)
}

// ─── Fetch last 30 daily close prices (for MA30 computation) ─────────────────

export async function fetchBtcDailyKlines(limit = 30): Promise<BinanceKline[]> {
  const res = await fetch(
    `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`,
    { next: { revalidate: 60 } } // cache for 60s on server
  )
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
  const raw = await res.json() as RawKline[]
  return raw.map((k) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }))
}

// ─── Compute MA30 from daily closes ──────────────────────────────────────────

export function computeMa30FromKlines(klines: BinanceKline[]): number {
  if (klines.length === 0) return 0
  const closes = klines.map((k) => k.close)
  return closes.reduce((a, b) => a + b, 0) / closes.length
}

// ─── Combined: fetch price + MA30 in one call ─────────────────────────────────

export interface BtcMarketData {
  price: number
  ma30: number
  priceHistory: number[]   // last 30 daily closes
  change24h: number        // % change vs previous close
}

export async function fetchBtcMarketData(): Promise<BtcMarketData> {
  const [spotPrice, klines] = await Promise.all([
    fetchBtcSpotPrice(),
    fetchBtcDailyKlines(31), // 31 so we can compute 24h change
  ])

  const closes = klines.map((k) => k.close)

  // 30-day MA using the last 30 closes (index 1-30, excluding today's partial close)
  const last30 = closes.slice(-30)
  const ma30 = last30.reduce((a, b) => a + b, 0) / last30.length

  // 24h change: today's spot vs yesterday's close
  const prevClose = closes[closes.length - 2] ?? closes[closes.length - 1]
  const change24h = prevClose > 0 ? ((spotPrice - prevClose) / prevClose) * 100 : 0

  return {
    price: spotPrice,
    ma30,
    priceHistory: last30,
    change24h,
  }
}
