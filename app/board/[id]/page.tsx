import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import { prisma } from '@/lib/prisma'
import type { BoardPageData } from '@/types'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

// Step 1: walk the previousBoard chain and return ordered board IDs
async function getChain(startId: string): Promise<string[]> {
  const chain: string[] = []
  let currentId: string | null = startId
  while (currentId && chain.length < 20) {
    chain.push(currentId)
    const row = await prisma.board.findUnique({
      where: { id: currentId },
      select: { previousBoard: true },
    })
    currentId = row?.previousBoard ?? null
  }
  return chain
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

  const previousCards: unknown[] = []

  if (board.previousBoard) {
    const chain = await getChain(board.previousBoard)
    const seen = new Set<string>()

    for (let i = 0; i < chain.length; i++) {
      const boardId = chain[i]
      // Direct previous board: show all action items
      // Older boards: only unresolved ones
      const isFirst = i === 0

      const rows = await prisma.card.findMany({
        where: {
          boardId,
          column: 'ACTION_ITEMS',
          ...(isFirst ? {} : { resolved: false }),
        },
        include: { reactions: true, linksFrom: true, linksTo: true },
        orderBy: { createdAt: 'asc' },
      })

      for (const card of rows) {
        if (!seen.has(card.id)) {
          seen.add(card.id)
          previousCards.push(card)
        }
      }
    }
  }

  return { board, previousCards } as unknown as BoardPageData
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const data = await getBoardData(id)

  if (!data) notFound()

  return <Board initialData={data} />
}
