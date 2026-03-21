'use client'

import { useState, useRef } from 'react'
import CardComponent from './Card'
import type { Card, CardLink, ColumnType } from '@/types'

const COLUMN_META: Record<ColumnType, {
  label: string
  color: string       // accent / border
  tint: string        // column bg tint
  textColor: string   // label text
  prompts: string[]
  placeholder: string
  emoji: string
}> = {
  WENT_WELL: {
    label: 'Went Well',
    color: '#7FB5A0',
    tint: '#F2F7F5',
    textColor: '#2D6A58',
    emoji: '🌿',
    placeholder: 'What went well this sprint?',
    prompts: [
      'A win worth celebrating?',
      'What should we keep doing?',
      'Great teamwork moment?',
    ],
  },
  WENT_POORLY: {
    label: 'Went Poorly',
    color: '#C4908A',
    tint: '#F7F3F2',
    textColor: '#7A3F3A',
    emoji: '🌧️',
    placeholder: 'What could have gone better?',
    prompts: [
      'What slowed us down?',
      'A blocker we didn\'t address?',
      'Something that caused frustration?',
    ],
  },
  IDEAS: {
    label: 'Ideas',
    color: '#C4A96B',
    tint: '#F7F5EF',
    textColor: '#7A6030',
    emoji: '💡',
    placeholder: 'Any ideas to try next sprint?',
    prompts: [
      'An experiment to try?',
      'A tool or process to explore?',
      'What would make us faster?',
    ],
  },
  ACTION_ITEMS: {
    label: 'Action Items',
    color: '#8A9CC7',
    tint: '#F2F4F9',
    textColor: '#384E82',
    emoji: '🎯',
    placeholder: 'What action should we take?',
    prompts: [
      'One thing we commit to changing?',
      'Who will own this?',
      'First concrete step?',
    ],
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
      className="board-column"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minWidth: '220px',
        background: meta.tint,
        borderRadius: '1.25rem',
        border: `1.5px solid ${meta.color}30`,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Color accent bar */}
      <div style={{ height: '3px', background: meta.color, flexShrink: 0 }} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1rem 0.625rem',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: meta.textColor,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: '500',
            color: meta.textColor,
            background: `${meta.color}25`,
            borderRadius: '9999px',
            padding: '0.125rem 0.5rem',
          }}
        >
          {columnCards.length}
        </span>
      </div>

      {/* Prompts */}
      <div
        style={{
          padding: '0 1rem 0.875rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
        }}
      >
        {meta.prompts.map((prompt) => (
          <p
            key={prompt}
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: meta.textColor,
              opacity: 0.75,
              fontWeight: '500',
              lineHeight: 1.5,
            }}
          >
            {prompt}
          </p>
        ))}
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 0.75rem',
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
            columnColor={meta.color}
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
            borderRadius: '0.625rem',
            border: `1.5px solid ${meta.color}50`,
            fontSize: '0.8125rem',
            lineHeight: '1.5',
            color: '#2D3748',
            outline: 'none',
            fontFamily: 'inherit',
            background: '#fff',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = meta.color)}
          onBlur={(e) => (e.target.style.borderColor = `${meta.color}50`)}
          disabled={submitting || linkMode}
        />
        <button
          onClick={submitCard}
          disabled={!newContent.trim() || submitting || linkMode}
          title="Add card"
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.625rem',
            border: 'none',
            background: !newContent.trim() || submitting || linkMode
              ? `${meta.color}20`
              : `${meta.color}55`,
            color: !newContent.trim() || submitting || linkMode
              ? `${meta.color}60`
              : meta.color,
            fontSize: '0.875rem',
            cursor: !newContent.trim() || submitting || linkMode
              ? 'not-allowed'
              : 'pointer',
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
