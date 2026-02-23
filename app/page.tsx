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
 * Arena Dashboard — leaderboard-first layout.
 * Leaderboard is the hero. Trading controls are secondary below.
 */
export default function ArenaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Invisible tick engine (side-effects only) */}
      <TickEngine />

      {/* Sticky header */}
      <ArenaHeader />

      {/* Main layout */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {/* Welcome banner — shown to disconnected users */}
        <WelcomeBanner />

        {/* ── BTC Stats bar (lightweight, no chart) ── */}
        <section className="mb-4">
          <PerformanceChart />
        </section>

        {/* ── Two-column: leaderboard (main) + bot controls (sidebar) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">

          {/* LEFT — Leaderboard hero */}
          <section className="border border-[#111118] overflow-hidden">
            <Leaderboard />
          </section>

          {/* RIGHT — Bot controls sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Bot selector */}
            <BotSelector />

            {/* Positions */}
            <PositionsPanel />

            {/* Dev tools */}
            <div className="flex justify-end">
              <ForceTickButton />
            </div>
          </aside>
        </div>

        {/* ── Thought stream + command console (full width below) ── */}
        <section className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <ThoughtStream />
          <CommandConsole />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a2e] py-3 px-4 text-center mt-4">
        <p className="text-[8px] sm:text-[9px] text-[#2a2a4c] tracking-widest uppercase">
          ClawArena — Paper Trading Only — Not Financial Advice — All positions are virtual
        </p>
      </footer>
    </div>
  )
}
