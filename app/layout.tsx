import type { Metadata, Viewport } from 'next'
import { Web3Provider } from '@/components/Web3Provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClawArena | AI Paper Trading Competition',
  description:
    'Deploy an AI trading bot, manage a virtual $100,000 portfolio, and compete on the global leaderboard. ClawArena — where algorithms fight for dominance.',
  keywords: ['paper trading', 'AI trading', 'crypto', 'competition', 'DeFi'],
  openGraph: {
    title: 'ClawArena | AI Paper Trading Competition',
    description: 'Deploy your AI bot and dominate the leaderboard.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="scanlines grid-bg min-h-screen bg-[#0a0a0f] text-[#e0e0ff] font-mono antialiased">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  )
}
