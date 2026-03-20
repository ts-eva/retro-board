'use client'

interface UserBadgeProps {
  name: string
}

export default function UserBadge({ name }: UserBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '9999px',
        background: '#faf5ff',
        border: '1.5px solid #e9d5ff',
        fontSize: '0.875rem',
        color: '#6d28d9',
        fontWeight: '500',
      }}
    >
      <span style={{ userSelect: 'none' }}>👤</span>
      <span>{name}</span>
    </div>
  )
}
