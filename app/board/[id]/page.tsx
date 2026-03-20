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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = []
  let currentId: string | null = startId
  let isFirst = true
  let hops = 0

  while (currentId && hops < 20) {
    const cardWhere = isFirst
      ? { column: 'ACTION_ITEMS' as const }
      : { column: 'ACTION_ITEMS' as const, resolved: false }

    const result = await prisma.board.findUnique({
      where: { id: currentId },
      select: {
        previousBoard: true,
        cards: {
          where: cardWhere,
          include: { reactions: true, linksFrom: true, linksTo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!result) break

    for (const card of result.cards) {
      if (!seen.has(card.id)) {
        seen.add(card.id)
        items.push(card)
      }
    }

    currentId = result.previousBoard
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
