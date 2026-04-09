'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../context/NotificationsContext'
import { useMessages } from '../context/MessagesContext'

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function TypeIcon({ type }) {
  const base = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  if (type === 'application') {
    return (
      <div style={{ ...base, backgroundColor: '#e8f4f3' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#237371" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    )
  }
  if (type === 'application_approved') {
    return (
      <div style={{ ...base, backgroundColor: '#e8f4f3' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#237371" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    )
  }
  if (type === 'application_declined') {
    return (
      <div style={{ ...base, backgroundColor: '#fdf2f2' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    )
  }
  if (type === 'service_completed') {
    return (
      <div style={{ ...base, backgroundColor: '#fef9e7' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#D4A017" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
    )
  }
  if (type === 'message') {
    return (
      <div style={{ ...base, backgroundColor: '#e8f4f3' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#237371" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    )
  }
  return (
    <div style={{ ...base, backgroundColor: '#f5f5f3' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94B7A2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
  )
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { openMessages } = useMessages()
  const router = useRouter()
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = async (notification) => {
    setIsOpen(false)
    if (!notification.is_read) await markAsRead(notification.id)

    if (notification.type === 'message') {
      openMessages()
      return
    }
    if (notification.type === 'application') {
      router.push('/my-posts')
      return
    }
    if (notification.type === 'application_approved' || notification.type === 'application_declined') {
      router.push('/my-applications')
      return
    }
    if (notification.type === 'service_completed') {
      router.push('/history')
      return
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isOpen ? '#237371' : '#94B7A2',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-6px',
            backgroundColor: '#c0392b',
            color: '#FEFFFF',
            borderRadius: '9999px',
            fontSize: '0.6rem',
            fontWeight: 700,
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            pointerEvents: 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: '-8px',
          width: '360px',
          backgroundColor: '#FEFFFF',
          border: '1px solid #E0E0DC',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 32px rgba(42,39,42,0.13)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid #E0E0DC',
          }}>
            <span style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: '#2A272A',
              letterSpacing: '0.01em',
            }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); markAllAsRead() }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#237371',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-nunito)',
                  padding: 0,
                }}
              >
                Mark All Read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#94B7A2',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-nunito)',
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = n.is_read ? '#f9f9f8' : '#e5f2f1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = n.is_read ? '#FEFFFF' : '#f0f8f7'
                  }}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    padding: '0.875rem 1rem',
                    borderBottom: i < notifications.length - 1 ? '1px solid #E0E0DC' : 'none',
                    backgroundColor: n.is_read ? '#FEFFFF' : '#f0f8f7',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid #237371',
                    cursor: 'pointer',
                  }}
                >
                  <TypeIcon type={n.type} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.825rem',
                      color: n.is_read ? '#6b7280' : '#2A272A',
                      fontWeight: n.is_read ? 400 : 600,
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      fontFamily: 'var(--font-nunito)',
                    }}>
                      {n.message}
                    </p>
                    <span style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '0.7rem',
                      color: '#94B7A2',
                      fontFamily: 'var(--font-nunito)',
                    }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  {!n.is_read && (
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: '#237371',
                      flexShrink: 0,
                      marginTop: 5,
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
