'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import Column from './Column'
import LinkOverlay from './LinkOverlay'
import PreviousActionItems from './PreviousActionItems'
import UserBadge from './UserBadge'
import NameModal from './NameModal'
import type { Board as BoardType, BoardPageData, Card, CardLink, ColumnType } from '@/types'

const COLUMNS: ColumnType[] = ['WENT_WELL', 'WENT_POORLY', 'IDEAS', 'ACTION_ITEMS']

interface Toast {
  id: string
  message: string
}

interface BoardProps {
  initialData: BoardPageData
}

export default function Board({ initialData }: BoardProps) {
  const { board: initialBoard, previousCards: initialPreviousCards } = initialData

  const [board] = useState<BoardType>(initialBoard)
  const [cards, setCards] = useState<Card[]>(initialBoard.cards)
  const [links, setLinks] = useState<CardLink[]>(() => {
    // Collect all unique links from cards
    const linkMap = new Map<string, CardLink>()
    for (const card of initialBoard.cards) {
      for (const link of card.linksFrom) {
        linkMap.set(link.id, link)
      }
      for (const link of card.linksTo) {
        linkMap.set(link.id, link)
      }
    }
    return Array.from(linkMap.values())
  })
  const [previousCards, setPreviousCards] = useState<Card[]>(initialPreviousCards)
  const [linkMode, setLinkMode] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [author, setAuthor] = useState<string>('')
  const [nameConfirmed, setNameConfirmed] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const boardId = board.id

  // Check localStorage on mount — if already confirmed, skip modal
  useEffect(() => {
    if (typeof window === 'undefined') return
    const confirmed = localStorage.getItem('retro-name-confirmed') === 'true'
    const stored = localStorage.getItem('retro-user-name')
    if (confirmed && stored) {
      setAuthor(stored)
      setNameConfirmed(true)
    }
  }, [])

  function handleNameConfirm(name: string) {
    setAuthor(name)
    setNameConfirmed(true)
  }

  function showToast(message: string) {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // Pusher subscriptions
  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(`board-${boardId}`)

    channel.bind('card-added', (data: { card: Card }) => {
      setCards((prev) => {
        if (prev.find((c) => c.id === data.card.id)) return prev
        return [...prev, data.card]
      })
    })

    channel.bind('card-updated', (data: { card: Card }) => {
      setCards((prev) =>
        prev.map((c) => (c.id === data.card.id ? data.card : c))
      )
      // Also update previousCards if applicable
      setPreviousCards((prev) =>
        prev.map((c) => (c.id === data.card.id ? data.card : c))
      )
    })

    channel.bind('card-deleted', (data: { cardId: string }) => {
      setCards((prev) => prev.filter((c) => c.id !== data.cardId))
      setLinks((prev) =>
        prev.filter(
          (l) => l.fromId !== data.cardId && l.toId !== data.cardId
        )
      )
    })

    channel.bind(
      'reaction-toggled',
      (data: {
        cardId: string
        emoji: string
        author: string
        action: 'added' | 'removed'
        reaction: { id: string; cardId: string; emoji: string; author: string } | null
      }) => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== data.cardId) return c
            const reactions =
              data.action === 'removed'
                ? c.reactions.filter(
                    (r) => !(r.emoji === data.emoji && r.author === data.author)
                  )
                : data.reaction
                ? [...c.reactions.filter(
                    (r) => !(r.emoji === data.emoji && r.author === data.author)
                  ), data.reaction]
                : c.reactions
            return { ...c, reactions }
          })
        )
      }
    )

    channel.bind('link-added', (data: { link: CardLink }) => {
      setLinks((prev) => {
        if (prev.find((l) => l.id === data.link.id)) return prev
        return [...prev, data.link]
      })
    })

    channel.bind('link-deleted', (data: { linkId: string }) => {
      setLinks((prev) => prev.filter((l) => l.id !== data.linkId))
    })

    channel.bind('user-joined', (data: { name: string }) => {
      showToast(`${data.name} joined the board`)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`board-${boardId}`)
    }
  }, [boardId])

  const handleSelectCard = useCallback(
    async (cardId: string) => {
      if (!linkMode) return

      if (!selectedCard) {
        setSelectedCard(cardId)
        return
      }

      if (selectedCard === cardId) {
        setSelectedCard(null)
        return
      }

      // Create link
      const fromId = selectedCard
      const toId = cardId
      setSelectedCard(null)
      setLinkMode(false)

      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId, toId }),
        })
        if (res.ok) {
          const link = await res.json()
          setLinks((prev) => {
            if (prev.find((l) => l.id === link.id)) return prev
            return [...prev, link]
          })
        }
      } catch {
        // ignore
      }
    },
    [linkMode, selectedCard]
  )

  async function handleDeleteLink(linkId: string) {
    try {
      await fetch('/api/links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId }),
      })
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch {
      // ignore
    }
  }

  function handleCardUpdate(updated: Card) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setPreviousCards((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
  }

  function handleCardDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
    setLinks((prev) =>
      prev.filter((l) => l.fromId !== cardId && l.toId !== cardId)
    )
  }

  function handleCardAdded(card: Card) {
    setCards((prev) => {
      if (prev.find((c) => c.id === card.id)) return prev
      return [...prev, card]
    })
  }

  // Build column → color map for link overlay
  const cardColumnMap: Record<string, ColumnType> = {}
  for (const card of cards) {
    cardColumnMap[card.id] = card.column
  }

  const boardIdLabel = board.id.slice(0, 8) + '…'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F2F4F7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!nameConfirmed && <NameModal onConfirm={handleNameConfirm} />}
      {/* Toolbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderBottom: '1.5px solid #E8ECF2',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#1c1917',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {board.title}
          </h1>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#a8a29e',
              fontFamily: 'var(--font-geist-mono), monospace',
              background: '#f5f5f4',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.375rem',
              userSelect: 'all',
              cursor: 'text',
            }}
            title={`Board ID: ${board.id}`}
          >
            {boardIdLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Copy board ID button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(board.id).then(() => {
                showToast('Board ID copied to clipboard!')
              })
            }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1.5px solid #e7e5e4',
              background: '#fff',
              fontSize: '0.8125rem',
              color: '#44403c',
              cursor: 'pointer',
              fontWeight: '500',
            }}
            title="Copy board ID"
          >
            Copy ID
          </button>

          {/* Link mode toggle */}
          <button
            onClick={() => {
              setLinkMode((m) => !m)
              setSelectedCard(null)
            }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              border: `1.5px solid ${linkMode ? '#8A9CC7' : '#E8ECF2'}`,
              background: linkMode ? '#EEF1F9' : '#fff',
              fontSize: '0.8125rem',
              color: linkMode ? '#384E82' : '#44403c',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.15s',
            }}
            title={linkMode ? 'Exit link mode' : 'Enter link mode'}
          >
            <span>🔗</span>
            <span>{linkMode ? 'Linking…' : 'Link'}</span>
          </button>

          {author && <UserBadge name={author} />}
        </div>
      </header>

      {/* Link mode banner */}
      {linkMode && (
        <div
          style={{
            background: '#EEF1F9',
            borderBottom: '1.5px solid #8A9CC7',
            padding: '0.5rem 1.5rem',
            fontSize: '0.8125rem',
            color: '#384E82',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🔗</span>
          <span>
            {selectedCard
              ? 'Now click a second card to create the link. Click the same card to cancel.'
              : 'Click a card to start a link, then click another card to connect them.'}
          </span>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        {/* Previous action items */}
        {previousCards.length > 0 && (
          <PreviousActionItems
            cards={previousCards}
            onCardUpdate={handleCardUpdate}
          />
        )}

        {/* Board columns */}
        <div
          ref={boardRef}
          style={{
            position: 'relative',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
            minHeight: '60vh',
            width: '100%',
          }}
        >
          {COLUMNS.map((col) => (
            <Column
              key={col}
              columnId={col}
              cards={cards}
              links={links}
              boardId={boardId}
              author={author}
              linkMode={linkMode}
              selectedCard={selectedCard}
              onSelectCard={handleSelectCard}
              onCardUpdate={handleCardUpdate}
              onCardDelete={handleCardDelete}
              onCardAdded={handleCardAdded}
            />
          ))}

          {/* Link overlay */}
          <LinkOverlay
            links={links}
            cardColumnMap={cardColumnMap}
            boardRef={boardRef}
            onDeleteLink={handleDeleteLink}
          />
        </div>
      </main>

      {/* Toasts */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: '0.625rem',
              background: '#1c1917',
              color: '#fafaf9',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
