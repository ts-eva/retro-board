'use client'

import { useState, useRef } from 'react'
import CardComponent from './Card'
import type { Card, CardLink, ColumnType } from '@/types'

const COLUMN_META: Record<ColumnType, { label: string; color: string; placeholder: string }> = {
  WENT_WELL: {
    label: 'Went Well',
    color: '#86EFAC',
    placeholder: 'What went well this sprint?',
  },
  WENT_POORLY: {
    label: 'Went Poorly',
    color: '#FDA4AF',
    placeholder: 'What could have gone better?',
  },
  IDEAS: {
    label: 'Ideas',
    color: '#FCD34D',
    placeholder: 'Any ideas to try next sprint?',
  },
  ACTION_ITEMS: {
    label: 'Action Items',
    color: '#C4B5FD',
    placeholder: 'What action should we take?',
  },
}

interface ColumnProps {
  columnId: ColumnType
  cards: Card[]
  links: CardLink[]
  boardId: string
  author: string
  linkMode: boolean
  selectedCard: string | null
  onSelectCard: (cardId: string) => void
  onCardUpdate: (card: Card) => void
  onCardDelete: (cardId: string) => void
  onCardAdded: (card: Card) => void
}

export default function Column({
  columnId,
  cards,
  boardId,
  author,
  linkMode,
  selectedCard,
  onSelectCard,
  onCardUpdate,
  onCardDelete,
  onCardAdded,
}: ColumnProps) {
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const meta = COLUMN_META[columnId]
  const columnCards = cards.filter((c) => c.column === columnId)

  async function submitCard() {
    const trimmed = newContent.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          column: columnId,
          content: trimmed,
          author,
        }),
      })
      if (res.ok) {
        const card = await res.json()
        onCardAdded(card)
        setNewContent('')
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
      textareaRef.current?.focus()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minWidth: '220px',
        maxWidth: '320px',
        background: '#fff',
        borderRadius: '1rem',
        border: '1.5px solid #f0ede9',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          height: '4px',
          background: meta.color,
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1rem 0.625rem',
          borderBottom: '1.5px solid #f5f5f4',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1c1917',
            letterSpacing: '-0.01em',
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#a8a29e',
            background: '#f5f5f4',
            borderRadius: '9999px',
            padding: '0.125rem 0.5rem',
          }}
        >
          {columnCards.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}
      >
        {columnCards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            author={author}
            linkMode={linkMode}
            isSelected={selectedCard === card.id}
            onSelect={() => onSelectCard(card.id)}
            onUpdate={onCardUpdate}
            onDelete={onCardDelete}
          />
        ))}
      </div>

      {/* Add card input */}
      <div
        style={{
          padding: '0.75rem',
          borderTop: '1.5px solid #f5f5f4',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submitCard()
            }
          }}
          placeholder={meta.placeholder}
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            padding: '0.5rem 0.625rem',
            borderRadius: '0.5rem',
            border: '1.5px solid #e7e5e4',
            fontSize: '0.8125rem',
            lineHeight: '1.5',
            color: '#1c1917',
            outline: 'none',
            fontFamily: 'inherit',
            background: '#fafaf9',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = meta.color)}
          onBlur={(e) => (e.target.style.borderColor = '#e7e5e4')}
          disabled={submitting || linkMode}
        />
        <button
          onClick={submitCard}
          disabled={!newContent.trim() || submitting || linkMode}
          title="Add card"
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            border: 'none',
            background:
              !newContent.trim() || submitting || linkMode ? '#f5f5f4' : meta.color,
            color:
              !newContent.trim() || submitting || linkMode ? '#d6d3d1' : '#1c1917',
            fontSize: '0.875rem',
            cursor:
              !newContent.trim() || submitting || linkMode ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          ✓
        </button>
      </div>
    </div>
  )
}
