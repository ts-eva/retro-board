import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import { prisma } from '@/lib/prisma'
import type { BoardPageData } from '@/types'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

// Walk the chain of previous boards collecting action items.
// Direct previous board: show all action items (resolved or not).
// Older boards in the chain: only unresolved ones (resolved = done, no need to surface).
// Cap at 20 hops to be safe.
async function collectPreviousActionItems(startId: string) {
  const seen = new Set<string>()
  const items: object[] = []
  let currentId: string | null = startId
  let isFirst = true
  let hops = 0

  while (currentId && hops < 20) {
    const board = await prisma.board.findUnique({
      where: { id: currentId },
      include: {
        cards: {
          where: isFirst
            ? { column: 'ACTION_ITEMS' }
            : { column: 'ACTION_ITEMS', resolved: false },
          include: { reactions: true, linksFrom: true, linksTo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!board) break

    for (const card of board.cards) {
      if (!seen.has(card.id)) {
        seen.add(card.id)
        items.push(card)
      }
    }

    currentId = board.previousBoard
    isFirst = false
    hops++
  }

  return items
}

async function getBoardData(id: string): Promise<BoardPageData | null> {
  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      cards: {
        include: { reactions: true, linksFrom: true, linksTo: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!board) return null

  const previousCards = board.previousBoard
    ? await collectPreviousActionItems(board.previousBoard)
    : []

  return { board, previousCards } as unknown as BoardPageData
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const data = await getBoardData(id)

  if (!data) notFound()

  return <Board initialData={data} />
}
