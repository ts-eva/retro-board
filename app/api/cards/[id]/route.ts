import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, resolved, discussed } = body as {
      content?: string
      resolved?: boolean
      discussed?: boolean
    }

    const existing = await prisma.card.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const card = await prisma.card.update({
      where: { id },
      data: {
        ...(content !== undefined ? { content: content.trim() } : {}),
        ...(resolved !== undefined ? { resolved } : {}),
        ...(discussed !== undefined ? { discussed } : {}),
      },
      include: {
        reactions: true,
        linksFrom: true,
        linksTo: true,
        comments: { orderBy: { createdAt: 'asc' } },
      },
    })

    await pusher
      .trigger(`board-${card.boardId}`, 'card-updated', { card })
      .catch(() => {})

    return NextResponse.json(card)
  } catch (error) {
    console.error('[PATCH /api/cards/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.card.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    await prisma.card.delete({ where: { id } })

    await pusher
      .trigger(`board-${existing.boardId}`, 'card-deleted', { cardId: id })
      .catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/cards/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    )
  }
}
