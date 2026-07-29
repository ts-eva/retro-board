'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient, setPusherUserName } from '@/lib/pusher-client'
import { motion, AnimatePresence } from 'framer-motion'
import type { PresenceChannel } from 'pusher-js'
import Column from './Column'
import LinkOverlay from './LinkOverlay'
import PreviousActionItems from './PreviousActionItems'
import UserBadge from './UserBadge'
import NameModal from './NameModal'
import TimerWidget from './TimerWidget'
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
  const { board: initialBoard, previousCards: initialPreviousCards, previousSessions: initialSessions } = initialData

  const [board] = useState<BoardType>(initialBoard)
  const [cards, setCards] = useState<Card[]>(initialBoard.cards)
  const [links, setLinks] = useState<CardLink[]>(() => {
    const linkMap = new Map<string, CardLink>()
    for (const card of initialBoard.cards) {
      for (const link of card.linksFrom) linkMap.set(link.id, link)
      for (const link of card.linksTo) linkMap.set(link.id, link)
    }
    return Array.from(linkMap.values())
  })
  const [previousCards, setPreviousCards] = useState<Card[]>(initialPreviousCards)
  const [previousSessions, setPreviousSessions] = useState(initialSessions)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [author, setAuthor] = useState<string>('')
  const [nameConfirmed, setNameConfirmed] = useState(false)
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [timerEnd, setTimerEnd] = useState<number | null>(null)
  const [showCalm, setShowCalm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)
  const boardId = board.id

  // Check localStorage on mount — if already confirmed, skip modal
  useEffect(() => {
    if (typeof window === 'undefined') return
    const confirmed = sessionStorage.getItem('retro-name-confirmed') === 'true'
    const stored = sessionStorage.getItem('retro-user-name')
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

  // Card/link events — subscribe immediately
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
      setCards((prev) => prev.map((c) => (c.id === data.card.id ? data.card : c)))
      setPreviousCards((prev) => prev.map((c) => (c.id === data.card.id ? data.card : c)))
      setPreviousSessions((prev) =>
        prev.map((s) => ({
          ...s,
          cards: s.cards.map((c) => (c.id === data.card.id ? data.card : c)),
        }))
      )
    })

    channel.bind('card-deleted', (data: { cardId: string }) => {
      setCards((prev) => prev.filter((c) => c.id !== data.cardId))
      setLinks((prev) =>
        prev.filter((l) => l.fromId !== data.cardId && l.toId !== data.cardId)
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
                ? [
                    ...c.reactions.filter(
                      (r) => !(r.emoji === data.emoji && r.author === data.author)
                    ),
                    data.reaction,
                  ]
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

    channel.bind('timer-started', (data: { durationMs: number }) => {
      setTimerEnd(Date.now() + data.durationMs)
    })

    channel.bind('timer-stopped', () => {
      setTimerEnd(null)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`board-${boardId}`)
    }
  }, [boardId])

  // Trigger calming overlay when timer expires
  useEffect(() => {
    if (timerEnd === null) return
    const msLeft = timerEnd - Date.now()
    if (msLeft <= 0) return
    const id = setTimeout(() => {
      setShowCalm(true)
      setTimerEnd(null)
      setTimeout(() => setShowCalm(false), 5000)
    }, msLeft)
    return () => clearTimeout(id)
  }, [timerEnd])

  // Presence channel — subscribe after name is confirmed
  useEffect(() => {
    if (!author) return

    setPusherUserName(author)
    const pusher = getPusherClient()
    const presence = pusher.subscribe(`presence-board-${boardId}`) as PresenceChannel

    presence.bind('pusher:subscription_succeeded', (data: { members: Record<string, { name: string }> }) => {
      setMembers(Object.entries(data.members).map(([id, m]) => ({ id, name: m.name })))
    })

    presence.bind('pusher:member_added', (member: { id: string; info: { name: string } }) => {
      setMembers((prev) => [...prev, { id: member.id, name: member.info.name }])
      showToast(`${member.info.name} joined`)
    })

    presence.bind('pusher:member_removed', (member: { id: string; info: { name: string } }) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    })

    presence.bind('pusher:subscription_error', (status: unknown) => {
      console.error('Presence subscription failed', status)
    })

    return () => {
      presence.unbind_all()
      pusher.unsubscribe(`presence-board-${boardId}`)
    }
  }, [author, boardId])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleSelectCard = useCallback(
    async (cardId: string) => {
      // Link mode removed — no-op
      void cardId
    },
    []
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
    setPreviousCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setPreviousSessions((prev) =>
      prev.map((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === updated.id ? updated : c)),
      }))
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

  const cardColumnMap: Record<string, ColumnType> = {}
  for (const card of cards) {
    cardColumnMap[card.id] = card.column
  }

  const boardIdLabel = board.id.slice(0, 8) + '…'

  // Members excluding current user
  const otherMembers = members.filter((m) => m.name !== author)

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
        className="board-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          gap: '0.5rem',
          borderBottom: '1.5px solid #E8ECF2',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="board-header-left"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}
        >
          <h1
            className="board-header-title"
            title={board.title}
            style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#1c1917',
              letterSpacing: '-0.02em',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {board.title}
          </h1>
          <span
            className="board-header-id"
            style={{
              fontSize: '0.75rem',
              color: '#a8a29e',
              fontFamily: 'var(--font-geist-mono), monospace',
              background: '#f5f5f4',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.375rem',
              userSelect: 'all',
              cursor: 'text',
              flexShrink: 0,
            }}
            title={`Board ID: ${board.id}`}
          >
            {boardIdLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Presence: other members */}
          {otherMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {otherMembers.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  title={m.name}
                  style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '9999px',
                    background: nameToColor(m.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '700',
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    border: '2px solid #fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    flexShrink: 0,
                    cursor: 'default',
                  }}
                >
                  {initials(m.name)}
                </div>
              ))}
              {otherMembers.length > 5 && (
                <span style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
                  +{otherMembers.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Timer */}
          <TimerWidget
            boardId={boardId}
            timerEnd={timerEnd}
            onStart={setTimerEnd}
            onStop={() => setTimerEnd(null)}
          />

          {author && <UserBadge name={author} />}

          {/* Hamburger menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="Menu"
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #e7e5e4',
                background: menuOpen ? '#f5f5f4' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                flexShrink: 0,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: '0.875rem',
                    height: '1.5px',
                    background: '#44403c',
                    borderRadius: '1px',
                  }}
                />
              ))}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: '#fff',
                  border: '1.5px solid #e7e5e4',
                  borderRadius: '0.75rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  minWidth: '11rem',
                  zIndex: 30,
                  overflow: 'hidden',
                }}
              >
                {[
                  {
                    label: 'Copy ID',
                    icon: '🔑',
                    description: 'For next session',
                    onClick: () => {
                      navigator.clipboard.writeText(board.id).then(() => showToast('Board ID copied!'))
                      setMenuOpen(false)
                    },
                  },
                  {
                    label: 'Share link',
                    icon: '🔗',
                    description: 'Copy board URL',
                    onClick: () => {
                      navigator.clipboard.writeText(window.location.href).then(() => showToast('Board link copied!'))
                      setMenuOpen(false)
                    },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#faf9f8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1c1917' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}

                <div style={{ height: '1px', background: '#f5f5f4', margin: '0.25rem 0' }} />

                <button
                  onClick={() => {
                    router.push(`/?from=${boardId}`)
                    setMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.625rem 0.875rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#faf9f8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: '1rem' }}>✨</span>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1c1917' }}>
                      New Retro
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
                      Continue from this session
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="board-main" style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        {/* Previous action items */}
        {previousSessions.length > 0 && (
          <PreviousActionItems
            sessions={previousSessions}
            onCardUpdate={handleCardUpdate}
          />
        )}

        {/* Board columns */}
        <div
          ref={boardRef}
          className="board-columns"
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
              linkMode={false}
              selectedCard={null}
              onSelectCard={handleSelectCard}
              onCardUpdate={handleCardUpdate}
              onCardDelete={handleCardDelete}
              onCardAdded={handleCardAdded}
            />
          ))}

          {/* Link overlay (shows existing links) */}
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

      {/* Calming timer-end overlay */}
      <AnimatePresence>
        {showCalm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, rgba(196,185,253,0.35) 0%, rgba(253,230,138,0.2) 60%, transparent 100%)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 150,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✨</div>
              <p
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#4c1d95',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Time&apos;s up
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// Deterministic color from a name string
function nameToColor(name: string): string {
  const colors = [
    '#7FB5A0', '#C4908A', '#C4A96B', '#8A9CC7',
    '#9B8EC4', '#C49B8A', '#8AB5C4', '#A0C48A',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
