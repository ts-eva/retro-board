'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [previousBoard, setPreviousBoard] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          previousBoard: previousBoard.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
      }

      const board = await res.json()
      router.push(`/board/${board.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        background: '#FAFAF9',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              letterSpacing: '-0.03em',
              color: '#1c1917',
              marginBottom: '0.5rem',
            }}
          >
            Retro Board
          </h1>
          <p style={{ color: '#78716c', fontSize: '1rem' }}>
            Run a smooth sprint retrospective with your team
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleStart}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Board title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="title"
              style={{ fontSize: '0.875rem', fontWeight: '500', color: '#44403c' }}
            >
              Board Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Sprint Retro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #e7e5e4',
                background: '#fff',
                fontSize: '0.9375rem',
                color: '#1c1917',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#a78bfa')}
              onBlur={(e) => (e.target.style.borderColor = '#e7e5e4')}
            />
          </div>

          {/* Previous board */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1.5px dashed #d6d3d1',
            }}
          >
            <label
              htmlFor="previousBoard"
              style={{ fontSize: '0.875rem', fontWeight: '500', color: '#44403c' }}
            >
              Continue from previous session?{' '}
              <span style={{ fontWeight: '400', color: '#a8a29e' }}>(optional)</span>
            </label>
            <p style={{ fontSize: '0.8125rem', color: '#a8a29e', margin: '0 0 0.5rem' }}>
              Paste a previous board ID to carry over unresolved action items.
            </p>
            <input
              id="previousBoard"
              type="text"
              placeholder="Previous board ID"
              value={previousBoard}
              onChange={(e) => setPreviousBoard(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #e7e5e4',
                background: '#fff',
                fontSize: '0.875rem',
                color: '#1c1917',
                fontFamily: 'var(--font-geist-mono), monospace',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#a78bfa')}
              onBlur={(e) => (e.target.style.borderColor = '#e7e5e4')}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                color: '#e11d48',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.625rem',
              border: 'none',
              background: loading ? '#c4b5fd' : '#7c3aed',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.background = '#6d28d9')
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.background = '#7c3aed')
            }}
          >
            {loading ? 'Creating board…' : 'Start Retro'}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#a8a29e' }}>
          Share the board URL with your team to collaborate in real time
        </p>
      </div>
    </main>
  )
}
