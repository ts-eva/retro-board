import { notFound } from 'next/navigation'
import Board from '@/components/Board'
import type { BoardPageData } from '@/types'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

async function getBoardData(id: string): Promise<BoardPageData | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/api/boards/${id}`, {
      cache: 'no-store',
    })

    if (res.status === 404) return null
    if (!res.ok) return null

    return res.json()
  } catch {
    return null
  }
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const data = await getBoardData(id)

  if (!data) {
    notFound()
  }

  return <Board initialData={data} />
}
