'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../../components/NavLinks'

export default function MessageThread() {
  const router = useRouter()
  const { id } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [hourModal, setHourModal] = useState(false)
  const [hourAmount, setHourAmount] = useState('')
  const [hourSubmitting, setHourSubmitting] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)

      const { data: app } = await supabase
        .from('applications')
        .select(`*, service_posts (id, title, hours_required, poster_id, profiles (id, full_name, username)), profiles (id, full_name, username)`)
        .eq('id', id)
        .single()

      if (!app || app.status !== 'approved') { router.push('/dashboard'); return }
      setApplication(app)

      const { data: initialMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true })

      messagesRef.current = initialMessages || []
      setMessages(initialMessages || [])
      if ((initialMessages || []).some(m => m.is_system)) setIsEnded(true)
      setLoading(false)

      const channel = supabase
        .channel(`room-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${id}` }, (payload) => {
          const newMsg = payload.new
          const already = messagesRef.current.find(m => m.id === newMsg.id)
          if (!already) {
            messagesRef.current = [...messagesRef.current, newMsg]
            setMessages([...messagesRef.current])
            if (newMsg.is_system) setIsEnded(true)
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `application_id=eq.${id}` }, (payload) => {
          messagesRef.current = messagesRef.current.map(m => m.id === payload.new.id ? payload.new : m)
          setMessages([...messagesRef.current])
        })
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    init()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleLeaveChat = async () => {
    const myProfile = currentUser?.id === application.service_posts.poster_id
      ? application.service_posts.profiles
      : application.profiles
    const name = myProfile?.full_name || myProfile?.username || 'Someone'
    await supabase.from('messages').insert({
      application_id: id,
      sender_id: currentUser.id,
      content: `${name} has left this conversation.`,
      is_system: true,
    })
    setIsEnded(true)
    setLeaveConfirm(false)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({ application_id: id, sender_id: currentUser.id, content })
    setSending(false)
  }

  const handleHourRequest = async () => {
    const amount = parseInt(hourAmount)
    if (!amount || amount <= 0) return
    setHourSubmitting(true)
    const myName = currentUser.id === application.service_posts.poster_id
      ? application.service_posts.profiles?.full_name || application.service_posts.profiles?.username
      : application.profiles?.full_name || application.profiles?.username
    await supabase.from('messages').insert({
      application_id: id,
      sender_id: currentUser.id,
      content: `${myName} is requesting ${amount} additional hour${amount !== 1 ? 's' : ''}.`,
      is_hour_request: true,
      hour_request_amount: amount,
      hour_request_status: 'pending',
    })
    setHourModal(false)
    setHourAmount('')
    setHourSubmitting(false)
  }

  const handleApproveHours = async (msg) => {
    await supabase.from('messages').update({ hour_request_status: 'approved' }).eq('id', msg.id)
    const newHours = application.service_posts.hours_required + msg.hour_request_amount
    await supabase.from('service_posts').update({ hours_required: newHours }).eq('id', application.service_posts.id)
    setApplication(prev => ({ ...prev, service_posts: { ...prev.service_posts, hours_required: newHours } }))
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, hour_request_status: 'approved' } : m))
  }

  const handleDeclineHours = async (msg) => {
    await supabase.from('messages').update({ hour_request_status: 'declined' }).eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, hour_request_status: 'declined' } : m))
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const otherPerson = currentUser?.id === application.service_posts.poster_id
    ? application.profiles
    : application.service_posts.profiles

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinks userId={currentUser?.id} />
        </div>
      </nav>

      <div style={{ padding: '1rem 2.5rem', borderBottom: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.7rem', color: '#94B7A2', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.25rem' }}>Service Exchange</p>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, color: '#2A272A' }}>{application.service_posts.title}</h1>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>
              Chatting with{' '}
              <Link href={`/profile/${otherPerson?.id}`} style={{ color: '#237371', fontWeight: 600, textDecoration: 'none' }}>
                {otherPerson?.full_name || otherPerson?.username}
              </Link>
              {' '}· {application.service_posts.hours_required} hours
            </p>
          </div>
          {!isEnded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => { setHourModal(true); setHourAmount('') }}
                style={{ fontSize: '0.8rem', color: '#237371', background: 'none', border: '1px solid #237371', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', cursor: 'pointer', backgroundColor: '#EBF5F0', fontWeight: 600 }}
              >
                + Hours
              </button>
              {leaveConfirm ? (
                <>
                  <span style={{ fontSize: '0.8rem', color: '#c0392b', fontWeight: 600 }}>End conversation?</span>
                  <button onClick={handleLeaveChat} style={{ padding: '0.35rem 0.875rem', backgroundColor: '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Yes</button>
                  <button onClick={() => setLeaveConfirm(false)} style={{ padding: '0.35rem 0.875rem', backgroundColor: '#FEFFFF', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.8rem' }}>No</button>
                </>
              ) : (
                <button onClick={() => setLeaveConfirm(true)} style={{ fontSize: '0.8rem', color: '#94B7A2', background: 'none', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', cursor: 'pointer', backgroundColor: '#FEFFFF' }}>
                  Leave Chat
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#94B7A2' }}>No messages yet. Say hello!</p>
            <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>Your contact info stays private — coordinate everything here.</p>
          </div>
        ) : messages.map(msg => {
          if (msg.is_hour_request) {
            const isRequester = msg.sender_id === currentUser?.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1rem 1.5rem', maxWidth: '360px', textAlign: 'center', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2A272A', marginBottom: '0.5rem' }}>{msg.content}</p>
                  {msg.hour_request_status === 'pending' && !isRequester && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => handleApproveHours(msg)} style={{ padding: '0.4rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Approve</button>
                      <button onClick={() => handleDeclineHours(msg)} style={{ padding: '0.4rem 1rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.8rem' }}>Decline</button>
                    </div>
                  )}
                  {msg.hour_request_status === 'pending' && isRequester && (
                    <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>Awaiting response...</span>
                  )}
                  {msg.hour_request_status === 'approved' && (
                    <span style={{ fontSize: '0.8rem', color: '#237371', fontWeight: 700 }}>✓ Approved — total hours updated</span>
                  )}
                  {msg.hour_request_status === 'declined' && (
                    <span style={{ fontSize: '0.8rem', color: '#c0392b', fontWeight: 700 }}>✗ Declined</span>
                  )}
                </div>
              </div>
            )
          }

          if (msg.is_system) {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
                <span style={{ fontSize: '0.75rem', color: '#94B7A2', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '9999px', padding: '0.3rem 1rem' }}>
                  {msg.content}
                </span>
              </div>
            )
          }

          const isMe = msg.sender_id === currentUser?.id
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '400px', padding: '0.75rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', backgroundColor: isMe ? '#237371' : '#F5F5F3', color: isMe ? '#FEFFFF' : '#2A272A', borderBottomRightRadius: isMe ? '2px' : '1rem', borderBottomLeftRadius: isMe ? '1rem' : '2px', border: isMe ? 'none' : '1px solid #E0E0DC' }}>
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

      {isEnded ? (
        <div style={{ padding: '1rem 2.5rem', borderTop: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0, textAlign: 'center' }}>
          <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>This conversation has ended.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} style={{ padding: '1rem 2.5rem', borderTop: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{ backgroundColor: sending || !newMessage.trim() ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            Send
          </button>
        </form>
      )}

      {/* Hour request modal */}
      {hourModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={() => setHourModal(false)} />
          <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '380px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Request Additional Hours</h2>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Ask {otherPerson?.full_name || otherPerson?.username} to adjust the hour total for this exchange.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Additional hours requested</label>
              <input
                type="number"
                min="1"
                value={hourAmount}
                onChange={e => setHourAmount(e.target.value)}
                placeholder="e.g. 1"
                autoFocus
                style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleHourRequest}
                disabled={hourSubmitting || !hourAmount || parseInt(hourAmount) <= 0}
                style={{ flex: 1, padding: '0.875rem', backgroundColor: hourSubmitting || !hourAmount ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: hourSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {hourSubmitting ? 'Sending...' : 'Send Request'}
              </button>
              <button onClick={() => setHourModal(false)} style={{ padding: '0.875rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
