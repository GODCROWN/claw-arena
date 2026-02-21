'use client'

import { useState, useRef, FormEvent, KeyboardEvent } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { ChevronRight, Loader2, X } from 'lucide-react'
import type { TrainBotResponse } from '@/types'

// ─── Command history hook ─────────────────────────────────────────────────────

function useCommandHistory() {
  const historyRef = useRef<string[]>([])
  const posRef = useRef<number>(-1)

  const push = (cmd: string) => {
    if (cmd.trim() === '') return
    historyRef.current = [cmd, ...historyRef.current].slice(0, 50)
    posRef.current = -1
  }

  const navigate = (dir: 'up' | 'down'): string | null => {
    const hist = historyRef.current
    if (hist.length === 0) return null

    if (dir === 'up') {
      posRef.current = Math.min(posRef.current + 1, hist.length - 1)
    } else {
      posRef.current = Math.max(posRef.current - 1, -1)
    }

    return posRef.current >= 0 ? hist[posRef.current] : null
  }

  return { push, navigate }
}

// ─── Main CommandConsole ──────────────────────────────────────────────────────

export function CommandConsole() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addInstruction = useGameStore((s) => s.addInstruction)
  const customInstructions = useGameStore((s) => s.customInstructions)
  const removeInstruction = useGameStore((s) => s.removeInstruction)
  const addThought = useGameStore((s) => s.addThought)
  const setStyleSummary = useGameStore((s) => s.setStyleSummary)
  const walletAddress = useGameStore((s) => s.walletAddress)

  const history = useCommandHistory()

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = history.navigate('up')
      if (prev !== null) setInput(prev)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = history.navigate('down')
      setInput(next ?? '')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    history.push(trimmed)
    setInput('')

    // Add to store instructions
    addInstruction(trimmed)

    addThought('SYS', `> ${trimmed}`)

    if (!walletAddress) {
      addThought('WARN', 'Connect wallet to train your AI bot.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/train-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'train',
          userMessage: trimmed,
          customInstructions: [...customInstructions, trimmed],
          priceHistory: [],
          currentBalance: 0,
          openPositions: [],
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        addThought('WARN', `Training failed: ${err.error ?? 'Unknown error'}`)
        return
      }

      const data = (await res.json()) as TrainBotResponse

      if (data.acknowledgment) {
        addThought('AI', `[AI] ${data.acknowledgment}`)
      }

      if (data.styleSummary) {
        setStyleSummary(data.styleSummary)
        addThought('AI', `[AI] Style updated → "${data.styleSummary}"`)
      }
    } catch (err) {
      addThought(
        'WARN',
        `Network error during training: ${err instanceof Error ? err.message : 'Unknown'}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border-t border-[#1a1a2e] bg-[#0a0a0f]">
      {/* Active rules list */}
      {customInstructions.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-b border-[#1a1a2e]/50">
          <p className="text-[8px] text-[#3a3a5c] uppercase tracking-widest mb-1">
            Active Rules ({customInstructions.length})
          </p>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {customInstructions.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-[#0f0f1a] border border-[#1a1a2e] px-2 py-0.5 text-[9px] text-[#00d4ff] group"
              >
                <span className="max-w-[180px] truncate">{rule}</span>
                <button
                  onClick={() => removeInstruction(idx)}
                  className="text-[#3a3a5c] hover:text-[#ff3333] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        <ChevronRight
          size={12}
          className={isLoading ? 'text-[#ffd700] animate-pulse' : 'text-[#00ff41]'}
        />

        {isLoading ? (
          <Loader2 size={10} className="text-[#ffd700] animate-spin shrink-0" />
        ) : null}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter trading rule or command..."
          disabled={isLoading}
          className="flex-1 terminal-input text-xs bg-transparent outline-none text-[#00ff41] placeholder-[#3a3a5c] disabled:opacity-50 caret-[#00ff41]"
          autoComplete="off"
          spellCheck={false}
        />

        {input.length > 0 && (
          <span className="text-[9px] text-[#3a3a5c]">↵</span>
        )}
      </form>

      {/* Help hint */}
      <div className="px-3 pb-2 flex gap-4 text-[8px] text-[#2a2a4c]">
        <span>↑↓ history</span>
        <span>Enter to submit rule</span>
        <span>Rules persist to AI on next tick</span>
      </div>
    </div>
  )
}
