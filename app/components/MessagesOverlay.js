'use client'

import { useRef, useEffect } from 'react'
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
  } = useMessages()

  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }}
        onClick={closeMessages}
      />
      <div style={{
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
      }}>

        {/* Conversation List */}
        <div style={{ width: '280px', borderRight: '1px solid #E0E0DC', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#2A272A' }}>Messages</h2>
              <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{conversations.length} conversations</p>
            </div>
            <button
              onClick={closeMessages}
              style={{ color: '#94B7A2', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
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
                onClick={() => openConversation(convo)}
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

        {/* Message Thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <p style={{ color: '#94B7A2' }}>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E0E0DC', flexShrink: 0 }}>
                <p style={{ fontWeight: 700, color: '#2A272A' }}>{activeConvo.otherPerson}</p>
                <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{activeConvo.title}</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No messages yet. Say hello!</p>
                  </div>
                ) : messages.map(msg => {
                  const isMe = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '280px', padding: '0.75rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', backgroundColor: isMe ? '#237371' : '#F5F5F3', color: isMe ? '#FEFFFF' : '#2A272A', borderBottomRightRadius: isMe ? '2px' : '1rem', borderBottomLeftRadius: isMe ? '1rem' : '2px' }}>
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
              <form onSubmit={handleSend} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E0E0DC', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  style={{ backgroundColor: sending || !newMessage.trim() ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
