import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardId, author, content, parentId } = body as {
      cardId: string
      author: string
      content: string
      parentId?: string | null
    }

    if (!cardId || !author || !content) {
      return NextResponse.json(
        { error: 'cardId, author, and content are required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        cardId,
        author: author.trim(),
        content: content.trim(),
        parentId: parentId || null,
      },
    })

    await pusher
      .trigger(`board-${card.boardId}`, 'comment-added', { comment })
      .catch(() => {})

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('[POST /api/comments]', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
