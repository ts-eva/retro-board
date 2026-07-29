import { pusher } from '@/lib/pusher'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { socket_id, channel_name, user_name, user_id } = await req.json()

  const auth = pusher.authorizeChannel(socket_id, channel_name, {
    user_id: user_id || socket_id,
    user_info: { name: user_name || 'Anonymous' },
  })

  return Response.json(auth)
}
