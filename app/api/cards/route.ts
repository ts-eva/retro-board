import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'
import type { ColumnType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { boardId, column, content, author } = body as {
      boardId: string
      column: ColumnType
      content: string
      author: string
    }

    if (!boardId || !column || !content || !author) {
      return NextResponse.json(
        { error: 'boardId, column, content and author are required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.create({
      data: {
        boardId,
        column,
        content: content.trim(),
        author: author.trim(),
      },
      include: {
        reactions: true,
        linksFrom: true,
        linksTo: true,
        comments: { orderBy: { createdAt: 'asc' } },
      },
    })

    await pusher
      .trigger(`board-${boardId}`, 'card-added', { card })
      .catch(() => {})

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    console.error('[POST /api/cards]', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    )
  }
}
