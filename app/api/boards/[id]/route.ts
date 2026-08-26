import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        cards: {
          include: {
            reactions: true,
            linksFrom: true,
            linksTo: true,
            comments: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    let previousCards: typeof board.cards = []

    if (board.previousBoard) {
      const prevBoard = await prisma.board.findUnique({
        where: { id: board.previousBoard },
        include: {
          cards: {
            where: { column: 'ACTION_ITEMS' },
            include: {
              reactions: true,
              linksFrom: true,
              linksTo: true,
              comments: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (prevBoard) {
        previousCards = prevBoard.cards
      }
    }

    return NextResponse.json({ board, previousCards })
  } catch (error) {
    console.error('[GET /api/boards/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}
