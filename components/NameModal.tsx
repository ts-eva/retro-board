'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRandomName } from '@/lib/names'

const STORAGE_KEY = 'retro-user-name'
const CONFIRMED_KEY = 'retro-name-confirmed'

interface NameModalProps {
  onConfirm: (name: string) => void
}

export default function NameModal({ onConfirm }: NameModalProps) {
  const [name, setName] = useState(() => {
    if (typeof window === 'undefined') return getRandomName()
    return localStorage.getItem(STORAGE_KEY) || getRandomName()
  })

  function reroll() {
    const next = getRandomName()
    setName(next)
  }

  function confirm() {
    localStorage.setItem(STORAGE_KEY, name)
    localStorage.setItem(CONFIRMED_KEY, 'true')
    onConfirm(name)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#fff',
            borderRadius: '1.25rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '22rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👋</div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1c1917',
                margin: '0 0 0.375rem',
                letterSpacing: '-0.02em',
              }}
            >
              You&apos;ve been assigned a name
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#78716c', margin: 0 }}>
              This is how your team will see you. You can re-roll once before joining.
            </p>
          </div>

          {/* Name display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              background: '#faf5ff',
              border: '1.5px solid #e9d5ff',
            }}
          >
            <span
              style={{
                fontSize: '1.0625rem',
                fontWeight: '600',
                color: '#6d28d9',
                letterSpacing: '-0.01em',
              }}
            >
              {name}
            </span>
            <button
              onClick={reroll}
              title="Roll a new name"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                lineHeight: 1,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(20deg) scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg) scale(1)')}
            >
              🎲
            </button>
          </div>

          {/* Confirm button */}
          <button
            onClick={confirm}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#7c3aed',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: '600',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#6d28d9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
          >
            Join as {name}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
