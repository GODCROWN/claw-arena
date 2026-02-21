/**
 * GET /api/market/btc
 *
 * Server-side proxy to Binance public API.
 * Avoids CORS issues in the browser and keeps Binance calls server-side.
 *
 * Returns: BtcMarketData { price, ma30, priceHistory, change24h }
 *
 * Cache: revalidated every 20 seconds via Next.js route cache headers.
 */

import { NextResponse } from 'next/server'
import { fetchBtcMarketData } from '@/lib/binance'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  try {
    const data = await fetchBtcMarketData()
    return NextResponse.json(data, {
      headers: {
        // Allow browser to cache for 20s; CDN for 15s
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=20',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching BTC market data'
    console.error('[/api/market/btc]', message)
    return NextResponse.json(
      { error: message },
      { status: 502 }
    )
  }
}
