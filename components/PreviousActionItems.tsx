'use client'

import { useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { motion, AnimatePresence } from 'framer-motion'
import type { Card, PreviousSession } from '@/types'

interface PreviousActionItemsProps {
  sessions: PreviousSession[]
  onCardUpdate: (card: Card) => void
}

export default function PreviousActionItems({
  sessions,
  onCardUpdate,
}: PreviousActionItemsProps) {
  const [open, setOpen] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const allCards = sessions.flatMap((s) => s.cards)
  if (!allCards.length) return null

  async function toggleResolved(card: Card) {
    if (toggling) return
    setToggling(card.id)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !card.resolved }),
      })
      if (res.ok) {
        const updated = await res.json()
        onCardUpdate(updated)
      }
    } catch {
      // ignore
    } finally {
      setToggling(null)
    }
  }

  const unresolvedCount = allCards.filter((c) => !c.resolved).length

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      style={{
        borderRadius: '0.75rem',
        border: '1.5px solid #e7e5e4',
        background: '#fff',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}
    >
      <Collapsible.Trigger asChild>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1c1917',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#faf9f8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋</span>
            <span>From last retro</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: unresolvedCount > 0 ? '#fef3c7' : '#dcfce7',
                color: unresolvedCount > 0 ? '#92400e' : '#166534',
              }}
            >
              {unresolvedCount > 0 ? `${unresolvedCount} unresolved` : 'All done!'}
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#a8a29e', fontWeight: '400' }}>
              — {allCards.length} action item{allCards.length !== 1 ? 's' : ''}
            </span>
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#a8a29e',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            ▼
          </span>
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  borderTop: '1.5px solid #f5f5f4',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {sessions.map((session) => (
                  <div key={session.boardId}>
                    {/* Session label */}
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#a8a29e',
                        margin: '0 0 0.375rem 0.25rem',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {session.boardTitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {session.cards.map((card) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.625rem 0.75rem',
                            borderRadius: '0.5rem',
                            background: card.resolved ? '#f9fafb' : '#fefce8',
                            border: `1.5px solid ${card.resolved ? '#f0ede9' : '#fde68a'}`,
                            opacity: card.resolved ? 0.6 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={card.resolved}
                            onChange={() => toggleResolved(card)}
                            disabled={toggling === card.id}
                            style={{
                              width: '1rem',
                              height: '1rem',
                              marginTop: '0.125rem',
                              cursor: 'pointer',
                              accentColor: '#7c3aed',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                color: card.resolved ? '#a8a29e' : '#1c1917',
                                textDecoration: card.resolved ? 'line-through' : 'none',
                                margin: 0,
                                wordBreak: 'break-word',
                              }}
                            >
                              {card.content}
                            </p>
                            <p
                              style={{
                                fontSize: '0.75rem',
                                color: '#a8a29e',
                                margin: '0.25rem 0 0',
                              }}
                            >
                              {card.author}
                            </p>
                          </div>
                          {card.resolved && (
                            <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>✅</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
