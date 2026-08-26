'use client'

import { useState } from 'react'
import type { Card, Comment } from '@/types'

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Pill that toggles the thread — placed inline wherever the caller's layout wants it
// (e.g. at the end of the reaction row).
export function CommentToggleButton({
  count,
  active,
  accentColor,
  onClick,
}: {
  count: number
  active: boolean
  accentColor: string
  onClick: (e: React.MouseEvent) => void
}) {
  const highlighted = active || count > 0
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.1875rem 0.5rem',
        borderRadius: '9999px',
        border: `1.5px solid ${highlighted ? accentColor : `${accentColor}30`}`,
        background: active ? `${accentColor}20` : '#f9f9f8',
        fontSize: '0.75rem',
        cursor: 'pointer',
        color: highlighted ? accentColor : '#78716c',
        fontWeight: highlighted ? '600' : '400',
      }}
      title="Thread"
    >
      <span>💬</span>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}

// Expandable thread — one level of replies. Caller decides when it's visible.
export function CommentPanel({
  card,
  author,
  accentColor,
  onUpdate,
}: {
  card: Card
  author: string
  accentColor: string
  onUpdate: (card: Card) => void
}) {
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postingComment, setPostingComment] = useState(false)

  async function postComment() {
    const trimmed = commentText.trim()
    if (!trimmed || postingComment) return
    setPostingComment(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, author, content: trimmed, parentId: replyTo }),
      })
      if (res.ok) {
        const comment: Comment = await res.json()
        onUpdate({ ...card, comments: [...card.comments, comment] })
        setCommentText('')
        setReplyTo(null)
      }
    } catch {
      // ignore
    } finally {
      setPostingComment(false)
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (res.ok) {
        const { commentIds } = await res.json()
        onUpdate({ ...card, comments: card.comments.filter((c) => !commentIds.includes(c.id)) })
      }
    } catch {
      // ignore
    }
  }

  const topLevelComments = card.comments.filter((c) => !c.parentId)
  const repliesByParent: Record<string, Comment[]> = {}
  for (const c of card.comments) {
    if (c.parentId) (repliesByParent[c.parentId] ??= []).push(c)
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginTop: '0.125rem',
        paddingTop: '0.5rem',
        borderTop: `1px solid ${accentColor}20`,
      }}
    >
      {topLevelComments.map((comment) => (
        <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <CommentRow
            comment={comment}
            author={author}
            onDelete={() => deleteComment(comment.id)}
            onReply={() => setReplyTo(comment.id)}
          />
          {(repliesByParent[comment.id] || []).map((reply) => (
            <div key={reply.id} style={{ marginLeft: '1.25rem' }}>
              <CommentRow
                comment={reply}
                author={author}
                onDelete={() => deleteComment(reply.id)}
              />
            </div>
          ))}
        </div>
      ))}

      {replyTo && (
        <div style={{ fontSize: '0.6875rem', color: '#a8a29e', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          Replying to {card.comments.find((c) => c.id === replyTo)?.author}
          <button
            onClick={() => setReplyTo(null)}
            style={{ border: 'none', background: 'none', color: '#a8a29e', cursor: 'pointer', fontSize: '0.6875rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); postComment() } }}
          placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
          disabled={postingComment}
          style={{
            flex: 1,
            padding: '0.375rem 0.5rem',
            borderRadius: '0.375rem',
            border: `1.5px solid ${accentColor}40`,
            fontSize: '0.75rem',
            outline: 'none',
            fontFamily: 'inherit',
            background: '#fff',
          }}
        />
        <button
          onClick={postComment}
          disabled={!commentText.trim() || postingComment}
          style={{
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.375rem 0.625rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: !commentText.trim() || postingComment ? 'not-allowed' : 'pointer',
            background: !commentText.trim() || postingComment ? `${accentColor}20` : `${accentColor}55`,
            color: !commentText.trim() || postingComment ? `${accentColor}60` : accentColor,
          }}
        >
          Post
        </button>
      </div>
    </div>
  )
}

function CommentRow({
  comment,
  author,
  onDelete,
  onReply,
}: {
  comment: Comment
  author: string
  onDelete: () => void
  onReply?: () => void
}) {
  const [hovering, setHovering] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ fontSize: '0.75rem', lineHeight: '1.4' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontWeight: '600', color: '#44403c' }}>{comment.author}</span>
        <span style={{ display: 'flex', gap: '0.375rem', color: '#a8a29e', fontSize: '0.6875rem' }}>
          {formatRelativeTime(comment.createdAt)}
          {hovering && onReply && (
            <button onClick={onReply} style={{ border: 'none', background: 'none', color: '#78716c', cursor: 'pointer', fontSize: '0.6875rem' }}>
              Reply
            </button>
          )}
          {hovering && comment.author === author && (
            <button onClick={onDelete} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.6875rem' }}>
              Delete
            </button>
          )}
        </span>
      </div>
      <p style={{ margin: 0, color: '#1c1917', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {comment.content}
      </p>
    </div>
  )
}
