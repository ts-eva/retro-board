import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, previousBoard } = body as {
      title?: string
      previousBoard?: string
    }

    const board = await prisma.board.create({
      data: {
        title: title?.trim() || 'Sprint Retro',
        previousBoard: previousBoard?.trim() || null,
      },
    })

    await pusher.trigger('boards', 'board-created', { board }).catch(() => {
      // Non-fatal: pusher trigger failure should not break the response
    })

    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error('[POST /api/boards]', error)
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 }
    )
  }
}
