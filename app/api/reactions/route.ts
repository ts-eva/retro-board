import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardId, emoji, author } = body as {
      cardId: string
      emoji: string
      author: string
    }

    if (!cardId || !emoji || !author) {
      return NextResponse.json(
        { error: 'cardId, emoji, and author are required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const existing = await prisma.reaction.findUnique({
      where: { cardId_emoji_author: { cardId, emoji, author } },
    })

    let reaction = null
    let action: 'added' | 'removed'

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      action = 'removed'
    } else {
      reaction = await prisma.reaction.create({
        data: { cardId, emoji, author },
      })
      action = 'added'
    }

    await pusher
      .trigger(`board-${card.boardId}`, 'reaction-toggled', {
        cardId,
        emoji,
        author,
        action,
        reaction,
      })
      .catch(() => {})

    return NextResponse.json({ action, reaction })
  } catch (error) {
    console.error('[POST /api/reactions]', error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    )
  }
}
