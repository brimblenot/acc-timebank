'use client'

import { useRef, useEffect, useState } from 'react'
import { useMessages } from '../context/MessagesContext'

export default function MessagesOverlay() {
  const {
    isOpen,
    closeMessages,
    conversations,
    activeConvo,
    openConversation,
    messages,
    newMessage,
    setNewMessage,
    handleSend,
    sending,
    unreadMap,
    userId,
    endedConvos,
    leaveConversation,
  } = useMessages()

  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'thread'
  const bottomRef = useRef(null)

  // Track viewport width for responsive layout
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Reset to list view whenever the panel opens
  useEffect(() => {
    if (isOpen) setMobileView('list')
  }, [isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  const handleOpenConversation = (convo) => {
    openConversation(convo)
    if (isMobile) setMobileView('thread')
  }

  const handleBack = () => setMobileView('list')

  // ── Layout helpers ──────────────────────────────────────────
  const showList   = !isMobile || mobileView === 'list'
  const showThread = !isMobile || mobileView === 'thread'

  const panelStyle = isMobile ? {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#FEFFFF',
    display: 'flex',
    overflow: 'hidden',
  } : {
    position: 'relative',
    margin: 'auto',
    width: '100%',
    maxWidth: '900px',
    height: '80vh',
    backgroundColor: '#FEFFFF',
    border: '1px solid #E0E0DC',
    borderRadius: '1rem',
    display: 'flex',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(42,39,42,0.15)',
  }

  const listColStyle = {
    width: isMobile ? '100%' : '280px',
    borderRight: isMobile ? 'none' : '1px solid #E0E0DC',
    display: showList ? 'flex' : 'none',
    flexDirection: 'column',
    flexShrink: 0,
  }

  const threadColStyle = {
    flex: 1,
    display: showThread ? 'flex' : 'none',
    flexDirection: 'column',
    minWidth: 0,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      {/* Backdrop — only tappable on desktop where it's visible */}
      {!isMobile && (
        <div
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }}
          onClick={closeMessages}
        />
      )}

      <div style={panelStyle}>

        {/* ── Conversation List ────────────────────────────── */}
        <div style={listColStyle}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#2A272A' }}>Messages</h2>
              <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={closeMessages}
              aria-label="Close messages"
              style={{ color: '#94B7A2', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}
            >×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No conversations yet.</p>
              </div>
            ) : conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => handleOpenConversation(convo)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.5rem',
                  background: activeConvo?.id === convo.id ? '#F5F5F3' : 'none',
                  border: 'none',
                  borderBottom: '1px solid #E0E0DC',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderLeft: activeConvo?.id === convo.id ? '3px solid #237371' : '3px solid transparent',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#237371', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEFFFF', fontWeight: 700, fontSize: '0.875rem' }}>
                    {convo.otherPerson?.[0]?.toUpperCase() || '?'}
                  </div>
                  {unreadMap[convo.id] > 0 && (
                    <span style={{ position: 'absolute', top: '-3px', right: '-3px', backgroundColor: '#c0392b', color: '#FEFFFF', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid #FEFFFF' }}>
                      {unreadMap[convo.id] > 99 ? '99+' : unreadMap[convo.id]}
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: unreadMap[convo.id] > 0 ? 700 : 600, fontSize: '0.875rem', color: '#2A272A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.otherPerson}</p>
                  <p style={{ color: '#94B7A2', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Message Thread ───────────────────────────────── */}
        <div style={threadColStyle}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <p style={{ color: '#94B7A2' }}>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: isMobile ? '0.875rem 1rem' : '1.25rem 1.5rem', borderBottom: '1px solid #E0E0DC', flexShrink: 0 }}>
                {leaveConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {isMobile && (
                      <button
                        onClick={handleBack}
                        style={{ color: '#94B7A2', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0, marginRight: '0.25rem', flexShrink: 0 }}
                      >
                        ‹ Back
                      </button>
                    )}
                    <p style={{ color: '#c0392b', fontSize: '0.8rem', fontWeight: 600, flex: 1 }}>End this conversation?</p>
                    <button onClick={async () => { await leaveConversation(activeConvo); setLeaveConfirm(false) }} style={{ padding: '0.35rem 0.875rem', backgroundColor: '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Yes, Leave</button>
                    <button onClick={() => setLeaveConfirm(false)} style={{ padding: '0.35rem 0.875rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : 0, justifyContent: isMobile ? 'flex-start' : 'space-between' }}>
                    {/* Back button — mobile only */}
                    {isMobile && (
                      <button
                        onClick={handleBack}
                        aria-label="Back to conversations"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#237371', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, padding: 0, flexShrink: 0 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                      </button>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: '#2A272A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeConvo.otherPerson}</p>
                      <p style={{ color: '#94B7A2', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeConvo.title}</p>
                    </div>
                    {!isMobile && !endedConvos[activeConvo.id] && (
                      <button onClick={() => setLeaveConfirm(true)} style={{ fontSize: '0.75rem', color: '#94B7A2', background: 'none', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.3rem 0.75rem', cursor: 'pointer', flexShrink: 0, marginLeft: '0.75rem' }}>
                        Leave Chat
                      </button>
                    )}
                    {isMobile && !endedConvos[activeConvo.id] && (
                      <button onClick={() => setLeaveConfirm(true)} style={{ fontSize: '0.75rem', color: '#94B7A2', background: 'none', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.3rem 0.6rem', cursor: 'pointer', flexShrink: 0 }}>
                        Leave
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No messages yet. Say hello!</p>
                  </div>
                ) : messages.map(msg => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94B7A2', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '9999px', padding: '0.3rem 1rem' }}>
                          {msg.content}
                        </span>
                      </div>
                    )
                  }
                  const isMe = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: isMobile ? '85%' : '280px',
                        padding: '0.75rem 1rem',
                        borderRadius: '1rem',
                        fontSize: isMobile ? '0.9375rem' : '0.875rem',
                        backgroundColor: isMe ? '#237371' : '#F5F5F3',
                        color: isMe ? '#FEFFFF' : '#2A272A',
                        borderBottomRightRadius: isMe ? '2px' : '1rem',
                        borderBottomLeftRadius: isMe ? '1rem' : '2px',
                        wordBreak: 'break-word',
                      }}>
                        <p>{msg.content}</p>
                        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.7 }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {endedConvos[activeConvo.id] ? (
                <div style={{ padding: isMobile ? '0.875rem 1rem' : '1rem 1.5rem', borderTop: '1px solid #E0E0DC', flexShrink: 0, textAlign: 'center' }}>
                  <p style={{ color: '#94B7A2', fontSize: '0.8rem' }}>This conversation has ended.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleSend}
                  style={{ padding: isMobile ? '0.625rem 0.75rem' : '1rem 1.5rem', borderTop: '1px solid #E0E0DC', flexShrink: 0, display: 'flex', gap: '0.625rem' }}
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      backgroundColor: '#F5F5F3',
                      border: '1px solid #E0E0DC',
                      borderRadius: '0.5rem',
                      padding: '0.75rem 1rem',
                      fontSize: isMobile ? '16px' : '0.875rem',
                      color: '#2A272A',
                      outline: 'none',
                      minHeight: isMobile ? '48px' : 'auto',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    style={{
                      backgroundColor: sending || !newMessage.trim() ? '#E0E0DC' : '#237371',
                      color: '#FEFFFF',
                      fontWeight: 700,
                      padding: isMobile ? '0 1.25rem' : '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                      fontSize: isMobile ? '0.9375rem' : '0.875rem',
                      minHeight: isMobile ? '48px' : 'auto',
                      flexShrink: 0,
                    }}
                  >
                    Send
                  </button>
                </form>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
