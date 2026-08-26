import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.comment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const card = await prisma.card.findUnique({ where: { id: existing.cardId } })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Deleting a top-level comment takes its one level of replies with it.
    const toDelete = await prisma.comment.findMany({
      where: { OR: [{ id }, { parentId: id }] },
    })
    const commentIds = toDelete.map((c) => c.id)
    await prisma.comment.deleteMany({ where: { id: { in: commentIds } } })

    await pusher
      .trigger(`board-${card.boardId}`, 'comment-deleted', {
        cardId: existing.cardId,
        commentIds,
      })
      .catch(() => {})

    return NextResponse.json({ success: true, commentIds })
  } catch (error) {
    console.error('[DELETE /api/comments/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
