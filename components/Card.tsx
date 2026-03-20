'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { Card as CardType, ColumnType, Reaction } from '@/types'

const EMOJIS = ['👍', '❤️', '🔥', '💡'] as const

interface CardProps {
  card: CardType
  author: string
  columnColor: string
  linkMode: boolean
  isSelected: boolean
  onSelect: () => void
  onUpdate: (card: CardType) => void
  onDelete: (cardId: string) => void
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function Card({
  card,
  author,
  columnColor,
  linkMode,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: CardProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(card.content)
  const [hovering, setHovering] = useState(false)
  const [savingReaction, setSavingReaction] = useState<string | null>(null)
  const [savingDiscussed, setSavingDiscussed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Swipe gesture
  const dragX = useMotionValue(0)
  const swipeHintOpacity = useTransform(dragX, [0, 40, 70], [0, 0.5, 1])
  const SWIPE_THRESHOLD = 60

  async function handleToggleDiscussed() {
    if (savingDiscussed) return
    setSavingDiscussed(true)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discussed: !card.discussed }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
      }
    } catch {
      // ignore
    } finally {
      setSavingDiscussed(false)
    }
  }

  async function saveEdit() {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === card.content) {
      setEditing(false)
      setEditContent(card.content)
      return
    }
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
      }
    } catch {
      setEditContent(card.content)
    }
    setEditing(false)
  }

  async function handleDelete() {
    try {
      await fetch(`/api/cards/${card.id}`, { method: 'DELETE' })
      onDelete(card.id)
    } catch {
      // ignore
    }
  }

  async function toggleReaction(emoji: string) {
    if (savingReaction) return
    setSavingReaction(emoji)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, emoji, author }),
      })
      if (res.ok) {
        const { action, reaction } = await res.json()
        const updatedReactions: Reaction[] =
          action === 'removed'
            ? card.reactions.filter(
                (r) => !(r.emoji === emoji && r.author === author)
              )
            : [...card.reactions, reaction]
        onUpdate({ ...card, reactions: updatedReactions })
      }
    } catch {
      // ignore
    } finally {
      setSavingReaction(null)
    }
  }

  function startEdit() {
    if (linkMode) return
    setEditing(true)
    setEditContent(card.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handleCardClick() {
    if (linkMode) onSelect()
  }

  const reactionCounts: Record<string, number> = {}
  const myReactions = new Set<string>()
  for (const r of card.reactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1
    if (r.author === author) myReactions.add(r.emoji)
  }

  const discussedGreen = '#7FB5A0'

  return (
    <div style={{ position: 'relative' }}>
      {/* Swipe hint — revealed behind card */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0.875rem',
          background: `${discussedGreen}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1rem',
          opacity: swipeHintOpacity,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>✓</span>
      </motion.div>

      <motion.div
        drag={editing || linkMode ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.35 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) {
            handleToggleDiscussed()
          }
          animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 })
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        data-card-id={card.id}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={handleCardClick}
        style={{
          x: dragX,
          position: 'relative',
          background: card.discussed ? '#f2faf7' : '#fff',
          borderRadius: '0.875rem',
          border: `1.5px solid ${isSelected ? columnColor : hovering && linkMode ? `${columnColor}80` : card.discussed ? `${discussedGreen}60` : `${columnColor}30`}`,
          borderLeft: `4px solid ${card.discussed ? discussedGreen : columnColor}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${columnColor}25`
            : hovering
            ? '0 4px 16px rgba(0,0,0,0.07)'
            : '0 1px 4px rgba(0,0,0,0.04)',
          cursor: linkMode ? 'pointer' : editing ? 'default' : 'grab',
          transition: 'box-shadow 0.15s, border-color 0.15s, background 0.2s',
          overflow: 'hidden',
          touchAction: 'pan-y',
        }}
      >
        {/* Delete button — top right */}
        {hovering && !linkMode && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            style={{
              position: 'absolute',
              top: '0.375rem',
              right: '0.375rem',
              width: '1.5rem',
              height: '1.5rem',
              borderRadius: '50%',
              border: 'none',
              background: '#fee2e2',
              color: '#dc2626',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fca5a5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
            title="Delete card"
          >
            ✕
          </button>
        )}

        {/* Discussed button — bottom right */}
        {(hovering && !linkMode && !editing) || card.discussed ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleDiscussed()
            }}
            disabled={savingDiscussed}
            style={{
              position: 'absolute',
              bottom: '0.375rem',
              right: '0.375rem',
              width: '1.5rem',
              height: '1.5rem',
              borderRadius: '50%',
              border: 'none',
              background: card.discussed ? discussedGreen : `${discussedGreen}25`,
              color: card.discussed ? '#fff' : discussedGreen,
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: savingDiscussed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!card.discussed) e.currentTarget.style.background = `${discussedGreen}50`
            }}
            onMouseLeave={(e) => {
              if (!card.discussed) e.currentTarget.style.background = `${discussedGreen}25`
            }}
            title={card.discussed ? 'Mark as not discussed' : 'Mark as discussed'}
          >
            ✓
          </button>
        ) : null}

        {/* Content */}
        <div style={{ padding: '0.75rem 0.875rem 0.5rem' }}>
          {editing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  saveEdit()
                }
                if (e.key === 'Escape') {
                  setEditing(false)
                  setEditContent(card.content)
                }
              }}
              style={{
                width: '100%',
                minHeight: '4rem',
                resize: 'vertical',
                border: '1.5px solid #a78bfa',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: '#1c1917',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#faf5ff',
              }}
            />
          ) : (
            <p
              onClick={startEdit}
              style={{
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: '#1c1917',
                margin: 0,
                cursor: linkMode ? 'pointer' : 'text',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                paddingRight: hovering && !linkMode ? '1.75rem' : '0',
                opacity: card.discussed ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {card.content}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.375rem 0.875rem 0.625rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          {/* Author + time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#a8a29e',
            }}
          >
            <span>{card.author}</span>
            <span>{formatRelativeTime(card.createdAt)}</span>
          </div>

          {/* Reactions */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {EMOJIS.map((emoji) => {
              const count = reactionCounts[emoji] || 0
              const mine = myReactions.has(emoji)
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleReaction(emoji)
                  }}
                  disabled={!!savingReaction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '9999px',
                    border: `1.5px solid ${mine ? columnColor : `${columnColor}30`}`,
                    background: mine ? `${columnColor}20` : '#f9f9f8',
                    fontSize: '0.75rem',
                    cursor: savingReaction ? 'not-allowed' : 'pointer',
                    color: mine ? columnColor : '#78716c',
                    fontWeight: mine ? '600' : '400',
                    transition: 'all 0.15s',
                    opacity: savingReaction && savingReaction !== emoji ? 0.6 : 1,
                  }}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
