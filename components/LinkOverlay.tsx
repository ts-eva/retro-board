'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { CardLink, ColumnType } from '@/types'

const COLUMN_COLORS: Record<ColumnType, string> = {
  WENT_WELL: '#86EFAC',
  WENT_POORLY: '#FDA4AF',
  IDEAS: '#FCD34D',
  ACTION_ITEMS: '#C4B5FD',
}

interface LinkOverlayProps {
  links: CardLink[]
  cardColumnMap: Record<string, ColumnType>
  boardRef: React.RefObject<HTMLDivElement | null>
  onDeleteLink: (linkId: string) => void
}

interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

function getCardRect(cardId: string, boardEl: HTMLDivElement): CardRect | null {
  const el = boardEl.querySelector(`[data-card-id="${cardId}"]`)
  if (!el) return null
  const cardBounds = el.getBoundingClientRect()
  const boardBounds = boardEl.getBoundingClientRect()
  return {
    left: cardBounds.left - boardBounds.left + boardEl.scrollLeft,
    top: cardBounds.top - boardBounds.top + boardEl.scrollTop,
    width: cardBounds.width,
    height: cardBounds.height,
  }
}

function cubicBezierPath(
  x1: number, y1: number,
  x2: number, y2: number
): string {
  const cx1 = x1 + (x2 - x1) * 0.5
  const cy1 = y1
  const cx2 = x1 + (x2 - x1) * 0.5
  const cy2 = y2
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

export default function LinkOverlay({
  links,
  cardColumnMap,
  boardRef,
  onDeleteLink,
}: LinkOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })
  const [tick, setTick] = useState(0)
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateSize = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    setSvgSize({
      width: board.scrollWidth,
      height: board.scrollHeight,
    })
    setTick((t) => t + 1)
    setIdle(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 2000)
  }, [boardRef])

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    updateSize()

    const ro = new ResizeObserver(updateSize)
    ro.observe(board)

    // Also observe all card elements
    const mo = new MutationObserver(updateSize)
    mo.observe(board, { childList: true, subtree: true, attributes: true })

    return () => {
      ro.disconnect()
      mo.disconnect()
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [boardRef, updateSize, links])

  if (!links.length) return null

  const board = boardRef.current
  if (!board) return null

  const paths: Array<{
    linkId: string
    d: string
    color: string
    midX: number
    midY: number
  }> = []

  for (const link of links) {
    const fromRect = getCardRect(link.fromId, board)
    const toRect = getCardRect(link.toId, board)
    if (!fromRect || !toRect) continue

    const x1 = fromRect.left + fromRect.width
    const y1 = fromRect.top + fromRect.height / 2
    const x2 = toRect.left
    const y2 = toRect.top + toRect.height / 2

    const col = cardColumnMap[link.fromId] as ColumnType | undefined
    const color = col ? COLUMN_COLORS[col] : '#a8a29e'

    const d = cubicBezierPath(x1, y1, x2, y2)
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2

    paths.push({ linkId: link.id, d, color, midX, midY })
  }

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: svgSize.width || '100%',
        height: svgSize.height || '100%',
        pointerEvents: 'none',
        zIndex: 5,
        opacity: idle ? 0.4 : 0.85,
        transition: 'opacity 0.6s ease',
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id="link-blur">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
      {paths.map(({ linkId, d, color, midX, midY }) => (
        <g key={linkId}>
          {/* Hit area */}
          <path
            d={d}
            stroke="transparent"
            strokeWidth={12}
            fill="none"
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={() => onDeleteLink(linkId)}
          />
          {/* Visible dashed line */}
          <path
            d={d}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="6 4"
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
          {/* Delete indicator dot at midpoint */}
          <circle
            cx={midX}
            cy={midY}
            r={6}
            fill={color}
            style={{ pointerEvents: 'all', cursor: 'pointer', opacity: 0.9 }}
            onClick={() => onDeleteLink(linkId)}
          >
            <title>Click to delete this link</title>
          </circle>
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize={8}
            fill="#1c1917"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            ✕
          </text>
        </g>
      ))}
    </svg>
  )
}
