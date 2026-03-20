import { pusher } from '@/lib/pusher'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { boardId, endsAt } = await req.json()
  await pusher.trigger(`board-${boardId}`, 'timer-started', { endsAt }).catch(() => {})
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { boardId } = await req.json()
  await pusher.trigger(`board-${boardId}`, 'timer-stopped', {}).catch(() => {})
  return NextResponse.json({ ok: true })
}
