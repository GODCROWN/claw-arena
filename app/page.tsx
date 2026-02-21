import { ArenaHeader } from '@/components/ArenaHeader'
import { PerformanceChart } from '@/components/PerformanceChart'
import { Leaderboard } from '@/components/Leaderboard'
import { ThoughtStream } from '@/components/ThoughtStream'
import { CommandConsole } from '@/components/CommandConsole'
import { BotSelector } from '@/components/BotSelector'
import { PositionsPanel } from '@/components/PositionsPanel'
import { TickEngine } from '@/components/TickEngine'
import { ForceTickButton } from '@/components/ForceTickButton'
import { WelcomeBanner } from '@/components/WelcomeBanner'

/**
 * Arena Dashboard — server component shell.
 * All interactive UI is delegated to client components.
 */
export default function ArenaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Invisible tick engine (side-effects only) */}
      <TickEngine />

      {/* Sticky header */}
      <ArenaHeader />

      {/* Main layout */}
      <main className="flex-1 container mx-auto px-3 py-4 max-w-[1400px]">
        {/* Welcome banner — shown to disconnected users */}
        <WelcomeBanner />

        {/* Top row: Performance chart (full width) */}
        <section className="mb-4">
          <PerformanceChart />
        </section>

        {/* Middle row: 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 mb-4">
          {/* Left column: Bot selector + market overview */}
          <aside>
            <BotSelector />
          </aside>

          {/* Center column: Thought stream + command console */}
          <section className="flex flex-col">
            <ThoughtStream />
            <CommandConsole />
          </section>

          {/* Right column: Positions + recent trades */}
          <aside>
            <PositionsPanel />
          </aside>
        </div>

        {/* Dev tools row */}
        <div className="flex justify-end mb-4">
          <ForceTickButton />
        </div>

        {/* Bottom: Leaderboard (full width) */}
        <section>
          <Leaderboard />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a2e] py-3 px-4 text-center">
        <p className="text-[9px] text-[#2a2a4c] tracking-widest uppercase">
          ClawArena — Paper Trading Only — Not Financial Advice — All positions are virtual
        </p>
      </footer>
    </div>
  )
}
