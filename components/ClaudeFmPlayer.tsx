'use client'

import { useEffect, useRef } from 'react'

export const STATIONS = [
  { id: 'tRsQsTMvPNg', label: 'Claude FM' },
  { id: 'W8XhWDIQp0g', label: 'Office Shrimp' },
  { id: 'rV6orDrFA1o', label: 'Alter Pavilion' },
  { id: 'bVO3MmEwXTI', label: 'Chinese LoFi' },
] as const

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  loadVideoById: (id: string) => void
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiReady: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (window.YT) return Promise.resolve()
  if (!apiReady) {
    apiReady = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => resolve()
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    })
  }
  return apiReady
}

export default function ClaudeFmPlayer({
  videoId,
  playing,
}: {
  videoId: string
  playing: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const videoIdRef = useRef(videoId)
  videoIdRef.current = videoId

  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new window.YT!.Player(containerRef.current, {
        videoId: videoIdRef.current,
        playerVars: { autoplay: 0 },
        events: {
          onReady: () => {
            readyRef.current = true
            if (playingRef.current) playerRef.current?.playVideo()
          },
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return
    playerRef.current.loadVideoById(videoId)
    if (!playingRef.current) playerRef.current.pauseVideo()
  }, [videoId])

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return
    if (playing) playerRef.current.playVideo()
    else playerRef.current.pauseVideo()
  }, [playing])

  return (
    <div
      title="Claude FM"
      style={{
        width: '120px',
        height: '68px',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
