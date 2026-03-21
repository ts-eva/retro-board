'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Card as CardType, Reaction } from '@/types'

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

  const isAuthor = card.author === author
  const discussed = !!card.discussed

  async function handleToggleDiscussed(e: React.MouseEvent) {
    e.stopPropagation()
    if (savingDiscussed) return
    setSavingDiscussed(true)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discussed: !discussed }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
      }
    } catch {
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

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
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
            ? card.reactions.filter((r) => !(r.emoji === emoji && r.author === author))
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
    if (linkMode || !isAuthor) return
    setEditing(true)
    setEditContent(card.content)
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(`[data-card-id="${card.id}"] textarea`)
      el?.focus()
    }, 0)
  }

  const reactionCounts: Record<string, number> = {}
  const myReactions = new Set<string>()
  for (const r of card.reactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1
    if (r.author === author) myReactions.add(r.emoji)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      data-card-id={card.id}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => { if (linkMode) onSelect() }}
      style={{
        position: 'relative',
        background: discussed ? `${columnColor}12` : '#fff',
        borderRadius: '0.875rem',
        borderTop: `1.5px solid ${isSelected ? columnColor : discussed ? `${columnColor}50` : `${columnColor}30`}`,
        borderRight: `1.5px solid ${isSelected ? columnColor : discussed ? `${columnColor}50` : `${columnColor}30`}`,
        borderBottom: `1.5px solid ${isSelected ? columnColor : discussed ? `${columnColor}50` : `${columnColor}30`}`,
        borderLeft: `4px solid ${discussed ? `${columnColor}80` : columnColor}`,
        boxShadow: hovering
          ? '0 4px 16px rgba(0,0,0,0.07)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: linkMode ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, border-color 0.2s, background 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Delete — top right, author only */}
      {hovering && !linkMode && !editing && isAuthor && (
        <button
          onClick={handleDelete}
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
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fca5a5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fee2e2')}
          title="Delete card"
        >
          ✕
        </button>
      )}

      {/* Discussed — bottom right, always visible */}
      <button
        onClick={handleToggleDiscussed}
        disabled={savingDiscussed}
        style={{
          position: 'absolute',
          bottom: '0.375rem',
          right: '0.375rem',
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          border: 'none',
          background: discussed
            ? columnColor
            : hovering
            ? `${columnColor}35`
            : 'transparent',
          color: discussed ? '#fff' : columnColor,
          fontSize: '0.7rem',
          cursor: savingDiscussed ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s, color 0.15s',
          zIndex: 10,
          opacity: discussed || hovering ? 1 : 0,
        }}
        title={discussed ? 'Mark as not discussed' : 'Mark as discussed'}
      >
        ◉
      </button>

      {/* Content */}
      <div style={{ padding: '0.75rem 2rem 0.5rem 0.875rem' }}>
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
              if (e.key === 'Escape') { setEditing(false); setEditContent(card.content) }
            }}
            autoFocus
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
              color: discussed ? `${columnColor}cc` : '#1c1917',
              margin: 0,
              cursor: isAuthor && !linkMode ? 'text' : 'default',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              transition: 'color 0.2s',
            }}
          >
            {card.content}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.375rem 2rem 0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a8a29e' }}>
          <span>{card.author}</span>
          <span>{formatRelativeTime(card.createdAt)}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {EMOJIS.map((emoji) => {
            const count = reactionCounts[emoji] || 0
            const mine = myReactions.has(emoji)
            return (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); toggleReaction(emoji) }}
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
  )
}
