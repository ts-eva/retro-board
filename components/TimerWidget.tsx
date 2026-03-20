'use client'

import { useState, useEffect, useRef } from 'react'

interface TimerWidgetProps {
  boardId: string
  timerEnd: number | null
  onStart: (endsAt: number) => void
  onStop: () => void
}

export default function TimerWidget({ boardId, timerEnd, onStart, onStop }: TimerWidgetProps) {
  const [expanded, setExpanded] = useState(false)
  const [minutes, setMinutes] = useState('5')
  const [remaining, setRemaining] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isRunning = timerEnd !== null && remaining > 0

  // Tick
  useEffect(() => {
    if (timerEnd === null) {
      setRemaining(0)
      return
    }
    function tick() {
      const diff = Math.ceil((timerEnd! - Date.now()) / 1000)
      setRemaining(Math.max(0, diff))
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [timerEnd])

  // Auto-close input when timer starts
  useEffect(() => {
    if (isRunning) setExpanded(false)
  }, [isRunning])

  async function handleStart() {
    const mins = parseFloat(minutes)
    if (!mins || mins <= 0) return
    const endsAt = Date.now() + mins * 60 * 1000
    onStart(endsAt)
    await fetch('/api/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, endsAt }),
    })
  }

  async function handleStop() {
    onStop()
    await fetch('/api/timer', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId }),
    })
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Color based on time remaining
  function countdownColor() {
    if (!timerEnd) return '#44403c'
    const total = (timerEnd - (timerEnd - remaining * 1000)) / 1000
    if (remaining <= 30) return '#c4908a'
    if (remaining <= 120) return '#c4a96b'
    return '#7fb5a0'
  }

  if (isRunning) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '0.9375rem',
            fontWeight: '700',
            color: countdownColor(),
            letterSpacing: '0.02em',
            minWidth: '3.5rem',
            textAlign: 'center',
          }}
        >
          {formatTime(remaining)}
        </span>
        <button
          onClick={handleStop}
          title="Stop timer"
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1.5px solid #e7e5e4',
            background: '#fff',
            fontSize: '0.75rem',
            color: '#a8a29e',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    )
  }

  if (expanded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <input
          ref={inputRef}
          type="number"
          min="1"
          max="60"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStart()
            if (e.key === 'Escape') setExpanded(false)
          }}
          style={{
            width: '3.5rem',
            padding: '0.3rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1.5px solid #E8ECF2',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-geist-mono), monospace',
            color: '#2D3748',
            outline: 'none',
            textAlign: 'center',
          }}
          autoFocus
        />
        <span style={{ fontSize: '0.8125rem', color: '#a8a29e' }}>min</span>
        <button
          onClick={handleStart}
          style={{
            padding: '0.3rem 0.625rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: '#7FB5A0',
            color: '#fff',
            fontSize: '0.8125rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Start
        </button>
        <button
          onClick={() => setExpanded(false)}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1.5px solid #e7e5e4',
            background: '#fff',
            fontSize: '0.75rem',
            color: '#a8a29e',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      title="Set timer"
      style={{
        padding: '0.375rem 0.625rem',
        borderRadius: '0.5rem',
        border: '1.5px solid #e7e5e4',
        background: '#fff',
        fontSize: '0.875rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        color: '#44403c',
      }}
    >
      ⏱
    </button>
  )
}
