import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export function GET(): NextResponse<{ status: string; timestamp: number }> {
  return NextResponse.json({
    status: 'online',
    timestamp: Date.now(),
  })
}
