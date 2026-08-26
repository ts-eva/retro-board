'use client'

import { useEffect, useRef, useState } from 'react'

export const STATIONS = [
  { id: 'tRsQsTMvPNg', label: 'Claude FM' },
  { id: 'zBdruS7aZac', label: 'Coffee Cat' },
  { id: 'rV6orDrFA1o', label: 'Alter Pavilion' },
  { id: 'bVO3MmEwXTI', label: 'Chinese LoFi' },
] as const

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  loadVideoById: (id: string) => void
  setVolume: (volume: number) => void
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
  const [volume, setVolume] = useState(50)
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  useEffect(() => {
    const stored = localStorage.getItem('retro-claude-fm-volume')
    if (stored) setVolume(Number(stored))
  }, [])

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
            playerRef.current?.setVolume(volumeRef.current)
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

  function handleVolumeChange(v: number) {
    setVolume(v)
    localStorage.setItem('retro-claude-fm-volume', String(v))
    playerRef.current?.setVolume(v)
  }

  return (
    <div
      title="Claude FM"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3125rem',
        padding: '0.375rem',
        width: '120px',
        boxSizing: 'content-box',
        borderRadius: '0.75rem',
        background: '#EDE9FE',
        border: '2px solid #D8CCFB',
        boxShadow: '0 2px 6px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
        flexShrink: 0,
      }}
    >
      {/* Screen — kept at the original size */}
      <div
        style={{
          width: '120px',
          height: '68px',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          border: '2px solid #C4B5FD',
          background: '#000',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Bezel: decorative knobs + volume slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', width: '120px' }}>
        <div style={{ display: 'flex', gap: '0.1875rem', flexShrink: 0 }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              style={{
                width: '0.375rem',
                height: '0.375rem',
                borderRadius: '9999px',
                background: '#C4B5FD',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          title={`Volume: ${volume}`}
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            width: 0,
            accentColor: '#A78BFA',
            height: '0.75rem',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  )
}
