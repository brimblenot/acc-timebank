'use client'

import { usePathname } from 'next/navigation'
import { useMessages } from '../context/MessagesContext'

// Only show on these member-facing pages
const ALLOWED_PATHS = new Set([
  '/dashboard', '/posts', '/my-posts', '/my-applications',
  '/history', '/hour-requests', '/events',
])

function isAllowedPath(pathname) {
  if (!pathname) return false
  if (ALLOWED_PATHS.has(pathname)) return true
  if (pathname.startsWith('/profile/')) return true
  return false
}

export default function FloatingMessageButton() {
  const { openMessages, totalUnread, userId } = useMessages()
  const pathname = usePathname()

  if (!userId || !isAllowedPath(pathname)) return null

  return (
    <button
      onClick={openMessages}
      title="Messages"
      className="fab-messages"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 40,
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#237371',
        color: '#FEFFFF',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(35,115,113,0.35)',
      }}
    >
      💬
      {totalUnread > 0 && (
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          backgroundColor: '#c0392b',
          color: '#FEFFFF',
          borderRadius: '9999px',
          fontSize: '0.65rem',
          fontWeight: 700,
          minWidth: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          border: '2px solid #FEFFFF',
        }}>
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  )
}
