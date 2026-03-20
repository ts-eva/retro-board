import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromId, toId } = body as { fromId: string; toId: string }

    if (!fromId || !toId) {
      return NextResponse.json(
        { error: 'fromId and toId are required' },
        { status: 400 }
      )
    }

    if (fromId === toId) {
      return NextResponse.json(
        { error: 'Cannot link a card to itself' },
        { status: 400 }
      )
    }

    const fromCard = await prisma.card.findUnique({ where: { id: fromId } })
    if (!fromCard) {
      return NextResponse.json({ error: 'Source card not found' }, { status: 404 })
    }

    const link = await prisma.cardLink.create({
      data: { fromId, toId },
    })

    await pusher
      .trigger(`board-${fromCard.boardId}`, 'link-added', { link })
      .catch(() => {})

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('[POST /api/links]', error)
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body as { id: string }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const link = await prisma.cardLink.findUnique({ where: { id } })
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const fromCard = await prisma.card.findUnique({ where: { id: link.fromId } })

    await prisma.cardLink.delete({ where: { id } })

    if (fromCard) {
      await pusher
        .trigger(`board-${fromCard.boardId}`, 'link-deleted', { linkId: id })
        .catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/links]', error)
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    )
  }
}
