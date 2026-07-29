import PusherClient from 'pusher-js'

let pusherClient: PusherClient | null = null
let _userName = 'Anonymous'

export function setPusherUserName(name: string) {
  _userName = name
}

// Stable per-tab id so reconnects (wifi blips, sleep, backgrounding) are
// recognized by Pusher as the same presence member instead of a new one.
function getClientId(): string {
  const existing = sessionStorage.getItem('retro-client-id')
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem('retro-client-id', id)
  return id
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
                user_id: getClientId(),
              }),
            })
            if (!res.ok) throw new Error(`Pusher auth failed: ${res.status}`)
            const data = await res.json()
            callback(null, data)
          } catch (err) {
            callback(err instanceof Error ? err : new Error('Pusher auth failed'), { auth: '' })
          }
        },
      },
    })
  }
  return pusherClient
}
