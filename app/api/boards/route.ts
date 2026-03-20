import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusher } from '@/lib/pusher'

function generateTitle(team?: string) {
  const now = new Date()
  const date = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return team ? `Sprint Retro · ${team} · ${date}` : `Sprint Retro · ${date}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { team, previousBoard } = body as {
      team?: string
      previousBoard?: string
    }

    const board = await prisma.board.create({
      data: {
        title: generateTitle(team?.trim()),
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
