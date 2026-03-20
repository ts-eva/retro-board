import PusherClient from 'pusher-js'

let pusherClient: PusherClient | null = null
let _userName = 'Anonymous'

export function setPusherUserName(name: string) {
  _userName = name
}

export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: {
        transport: 'ajax',
        endpoint: '/api/pusher/auth',
        customHandler: async ({ socketId, channelName }, callback) => {
          try {
            const res = await fetch('/api/pusher/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channelName,
                user_name: _userName,
              }),
            })
            const data = await res.json()
            callback(null, data)
          } catch {
            callback(new Error('Pusher auth failed'), { auth: '' })
          }
        },
      },
    })
  }
  return pusherClient
}
