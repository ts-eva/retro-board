import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import { prisma } from '@/lib/prisma'
import type { BoardPageData, PreviousSession } from '@/types'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

// Walk the previousBoard chain and return ordered board IDs
async function getChain(startId: string): Promise<string[]> {
  const chain: string[] = []
  let currentId: string | null = startId
  while (currentId && chain.length < 20) {
    chain.push(currentId)
    const row: { previousBoard: string | null } | null =
      await prisma.board.findUnique({
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
        include: { reactions: true, linksFrom: true, linksTo: true, comments: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!board) return null

  const previousSessions: PreviousSession[] = []
  const allPreviousCards: unknown[] = []

  if (board.previousBoard) {
    const chain = await getChain(board.previousBoard)
    const seen = new Set<string>()

    for (let i = 0; i < chain.length; i++) {
      const boardId = chain[i]
      const isFirst = i === 0

      const [boardMeta, rows] = await Promise.all([
        prisma.board.findUnique({ where: { id: boardId }, select: { title: true } }),
        prisma.card.findMany({
          where: {
            boardId,
            column: 'ACTION_ITEMS',
            ...(isFirst ? {} : { resolved: false }),
          },
          include: { reactions: true, linksFrom: true, linksTo: true, comments: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        }),
      ])

      const sessionCards: unknown[] = []
      for (const card of rows) {
        if (!seen.has(card.id)) {
          seen.add(card.id)
          allPreviousCards.push(card)
          sessionCards.push(card)
        }
      }

      if (sessionCards.length > 0) {
        previousSessions.push({
          boardId,
          boardTitle: boardMeta?.title ?? boardId.slice(0, 8),
          cards: sessionCards as never,
        })
      }
    }
  }

  return {
    board,
    previousCards: allPreviousCards,
    previousSessions,
  } as unknown as BoardPageData
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const data = await getBoardData(id)

  if (!data) notFound()

  return <Board initialData={data} />
}
