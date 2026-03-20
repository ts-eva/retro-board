import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import { prisma } from '@/lib/prisma'
import type { BoardPageData } from '@/types'

interface BoardPageProps {
  params: Promise<{ id: string }>
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

  let previousCards: typeof board.cards = []

  if (board.previousBoard) {
    const prevBoard = await prisma.board.findUnique({
      where: { id: board.previousBoard },
      include: {
        cards: {
          where: { column: 'ACTION_ITEMS' },
          include: { reactions: true, linksFrom: true, linksTo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (prevBoard) previousCards = prevBoard.cards
  }

  return { board, previousCards } as unknown as BoardPageData
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const data = await getBoardData(id)

  if (!data) notFound()

  return <Board initialData={data} />
}
