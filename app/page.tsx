'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [team, setTeam] = useState('')
  const [previousBoard, setPreviousBoard] = useState('')

  useEffect(() => {
    const from = searchParams.get('from')
    if (from) setPreviousBoard(from)
  }, [searchParams])
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
          team: team.trim() || undefined,
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
        background: '#F2F4F7',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '26rem',
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
              color: '#2D3748',
              marginBottom: '0.5rem',
            }}
          >
            Retro Board
          </h1>
          <p style={{ color: '#718096', fontSize: '1rem', margin: 0 }}>
            Run a smooth sprint retrospective with your team
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleStart}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {/* Team name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="team"
              style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4A5568' }}
            >
              Team name{' '}
              <span style={{ fontWeight: '400', color: '#A0AEC0' }}>(optional)</span>
            </label>
            <input
              id="team"
              type="text"
              placeholder="e.g. Frontend, Platform, Growth…"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #E2E8F0',
                background: '#fff',
                fontSize: '0.9375rem',
                color: '#2D3748',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#8A9CC7')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Previous board */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              padding: '1rem',
              borderRadius: '0.875rem',
              border: '1.5px dashed #CBD5E0',
              background: '#fff',
            }}
          >
            <label
              htmlFor="previousBoard"
              style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4A5568' }}
            >
              Continue from previous session?{' '}
              <span style={{ fontWeight: '400', color: '#A0AEC0' }}>(optional)</span>
            </label>
            <p style={{ fontSize: '0.8125rem', color: '#A0AEC0', margin: '0 0 0.5rem' }}>
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
                border: '1.5px solid #E2E8F0',
                background: '#F7F9FC',
                fontSize: '0.875rem',
                color: '#2D3748',
                fontFamily: 'var(--font-geist-mono), monospace',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#8A9CC7')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#FFF5F5',
                border: '1.5px solid #FEB2B2',
                color: '#C53030',
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
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: loading ? '#8A9CC7' : '#5B7FA6',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.background = '#4A6E95')
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.background = '#5B7FA6')
            }}
          >
            {loading ? 'Creating board…' : 'Start Retro'}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#A0AEC0', margin: 0 }}>
          Share the board URL with your team to collaborate in real time
        </p>
      </div>
    </main>
  )
}
