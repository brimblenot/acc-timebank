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
  // Leave-chat modal
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Hour-request modal
  const [hourModal, setHourModal] = useState(false)
  const [hourAmount, setHourAmount] = useState('')
  const [hourSubmitting, setHourSubmitting] = useState(false)
  const [approving, setApproving] = useState(null)
  const [hourError, setHourError] = useState(null)
  const bottomRef = useRef(null)
  const messagesRef = useRef([])

  // A "leave chat" system message has sender_id set (the person who left).
  // Automated system messages (hour approval/decline) have sender_id = null.
  // Only leave messages should end the conversation and disable the input.
  const isLeaveMessage = (m) => m.is_system && m.sender_id !== null

  // Strip already-resolved hour-request messages so they never reappear.
  const filterMessages = (msgs) =>
    msgs.filter(m => !m.is_hour_request || m.hour_request_status === 'pending')

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

      const filtered = filterMessages(initialMessages || [])
      messagesRef.current = filtered
      setMessages(filtered)
      // Only a leave-type system message (sender_id set) ends the conversation.
      if ((initialMessages || []).some(isLeaveMessage)) setIsEnded(true)
      setLoading(false)

      const channel = supabase
        .channel(`room-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${id}` }, (payload) => {
          const newMsg = payload.new
          const already = messagesRef.current.find(m => m.id === newMsg.id)
          // Discard approved/declined hour-request messages if somehow inserted
          if (newMsg.is_hour_request && newMsg.hour_request_status !== 'pending') return
          if (!already) {
            messagesRef.current = [...messagesRef.current, newMsg]
            setMessages([...messagesRef.current])
            if (isLeaveMessage(newMsg)) setIsEnded(true)
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `application_id=eq.${id}` }, (payload) => {
          const updated = payload.new
          // When an hour request is resolved remotely, remove it from state
          if (updated.is_hour_request && updated.hour_request_status !== 'pending') {
            messagesRef.current = messagesRef.current.filter(m => m.id !== updated.id)
          } else {
            messagesRef.current = messagesRef.current.map(m => m.id === updated.id ? updated : m)
          }
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

  // ─── Leave chat ──────────────────────────────────────────────────────────────
  const handleLeaveChat = async () => {
    if (leaving) return
    setLeaving(true)

    const isUserApplicant = currentUser.id === application.profiles?.id
    const myProfile = isUserApplicant ? application.profiles : application.service_posts.profiles
    const name = myProfile?.full_name || myProfile?.username || 'Someone'
    const postId = application.service_posts.id
    const postTitle = application.service_posts.title

    // 1. Cancel this application
    await supabase.from('applications').update({ status: 'cancelled' }).eq('id', id)

    // 2. Reopen the service post so new applicants can apply
    await supabase.from('service_posts').update({ status: 'open' }).eq('id', postId)

    // 3. Decline all other pending applications on this post so it starts fresh
    await supabase
      .from('applications')
      .update({ status: 'declined' })
      .eq('post_id', postId)
      .eq('status', 'pending')
      .neq('id', id)

    // 4. Insert a leave-type system message (sender_id set → marks conversation as ended)
    await supabase.from('messages').insert({
      application_id: id,
      sender_id: currentUser.id,
      content: `${name} has left this conversation. The exchange has been cancelled and "${postTitle}" has been reopened.`,
      is_system: true,
    })

    // 5. Redirect
    setLeaving(false)
    router.push(isUserApplicant ? '/my-applications' : '/my-posts')
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({ application_id: id, sender_id: currentUser.id, content })
    setSending(false)
  }

  // ─── Hour request ────────────────────────────────────────────────────────────
  const handleHourRequest = async () => {
    const amount = parseInt(hourAmount)
    if (!amount || amount <= 0) return
    setHourSubmitting(true)
    const myName = application.profiles?.full_name || application.profiles?.username
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
    if (approving) return
    setHourError(null)
    setApproving(msg.id)

    // Guard: re-fetch to confirm still pending before doing anything
    const { data: fresh } = await supabase
      .from('messages')
      .select('hour_request_status')
      .eq('id', msg.id)
      .single()
    if (fresh?.hour_request_status !== 'pending') {
      setApproving(null)
      return
    }

    // Transfer hours from poster → applicant via RPC
    const applicantId = application.profiles.id
    const posterId = application.service_posts.poster_id
    const { error: rpcError } = await supabase.rpc('transfer_hours_for_request', {
      from_user: posterId,
      to_user: applicantId,
      amount: msg.hour_request_amount,
    })
    if (rpcError) {
      setHourError(rpcError.message)
      setApproving(null)
      return
    }

    // Update service post hour total
    const newHours = application.service_posts.hours_required + msg.hour_request_amount
    await supabase.from('service_posts').update({ hours_required: newHours }).eq('id', application.service_posts.id)
    setApplication(prev => ({ ...prev, service_posts: { ...prev.service_posts, hours_required: newHours } }))

    // Mark request approved so it cannot be approved again
    await supabase.from('messages').update({ hour_request_status: 'approved' }).eq('id', msg.id)

    // Insert automated system message (sender_id = null → does NOT end conversation)
    const applicantName = application.profiles?.full_name || application.profiles?.username || 'the applicant'
    await supabase.from('messages').insert({
      application_id: id,
      sender_id: null,
      content: `✓ ${msg.hour_request_amount} additional hour${msg.hour_request_amount !== 1 ? 's' : ''} approved and transferred. Thank you for your service.`,
      is_system: true,
    })

    // Remove request card from UI immediately
    messagesRef.current = messagesRef.current.filter(m => m.id !== msg.id)
    setMessages([...messagesRef.current])
    setApproving(null)
  }

  const handleDeclineHours = async (msg) => {
    if (approving) return
    setHourError(null)
    setApproving(msg.id)

    // Guard: re-fetch to confirm still pending
    const { data: fresh } = await supabase
      .from('messages')
      .select('hour_request_status')
      .eq('id', msg.id)
      .single()
    if (fresh?.hour_request_status !== 'pending') {
      setApproving(null)
      return
    }

    await supabase.from('messages').update({ hour_request_status: 'declined' }).eq('id', msg.id)

    await supabase.from('messages').insert({
      application_id: id,
      sender_id: null,
      content: '✗ Additional hour request was declined.',
      is_system: true,
    })

    // Remove request card from UI immediately
    messagesRef.current = messagesRef.current.filter(m => m.id !== msg.id)
    setMessages([...messagesRef.current])
    setApproving(null)
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const otherPerson = currentUser?.id === application.service_posts.poster_id
    ? application.profiles
    : application.service_posts.profiles

  // Only the applicant (person who applied and was accepted) sees the request button.
  const isApplicant = currentUser?.id === application.profiles?.id

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="msg-page" style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinks userId={currentUser?.id} />
        </div>
      </nav>

      {/* ── Header bar ── */}
      <div className="msg-header-bar" style={{ padding: '1rem 2.5rem', borderBottom: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          {/* Left: post info */}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.7rem', color: '#94B7A2', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.25rem' }}>Service Exchange</p>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, color: '#2A272A' }}>{application.service_posts.title}</h1>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>
              Chatting with{' '}
              <Link href={`/profile/${otherPerson?.id}`} style={{ color: '#237371', fontWeight: 600, textDecoration: 'none' }}>
                {otherPerson?.full_name || otherPerson?.username}
              </Link>
              {' '}· {application.service_posts.hours_required} hour{application.service_posts.hours_required !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Right: action buttons */}
          {!isEnded && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
              {/* Hint text + request button — applicant only */}
              {isApplicant && (
                <span className="req-hours-hint" style={{ fontSize: '0.7rem', color: '#94B7A2', fontStyle: 'italic' }}>
                  Service took longer than expected?
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isApplicant && (
                  <button
                    onClick={() => { setHourModal(true); setHourAmount(''); setHourError(null) }}
                    style={{
                      fontSize: '0.8rem',
                      color: '#237371',
                      backgroundColor: '#FEFFFF',
                      border: '1.5px solid #237371',
                      borderRadius: '0.5rem',
                      padding: '0 0.875rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="req-hours-full">Request Additional Hours</span>
                    <span className="req-hours-short">Request Additional Hours</span>
                  </button>
                )}
                <button
                  onClick={() => setLeaveModal(true)}
                  style={{ fontSize: '0.8rem', color: '#94B7A2', backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', cursor: 'pointer', minHeight: '44px' }}
                >
                  Leave Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Message thread ── */}
      <div className="msg-thread" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#94B7A2' }}>No messages yet. Say hello!</p>
            <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>Your contact info stays private — coordinate everything here.</p>
          </div>
        ) : messages.map(msg => {

          // ── Hour-request card ──
          if (msg.is_hour_request) {
            if (msg.hour_request_status !== 'pending') return null
            const isRequester = msg.sender_id === currentUser?.id
            const isActioning = approving === msg.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1rem 1.5rem', maxWidth: '360px', textAlign: 'center', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2A272A', marginBottom: '0.5rem' }}>{msg.content}</p>
                  {!isRequester && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleApproveHours(msg)}
                        disabled={isActioning}
                        style={{ padding: '0.4rem 1rem', backgroundColor: isActioning ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                      >
                        {isActioning ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDeclineHours(msg)}
                        disabled={isActioning}
                        style={{ padding: '0.4rem 1rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {isRequester && (
                    <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>Awaiting response...</span>
                  )}
                  {hourError && !isRequester && (
                    <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem' }}>{hourError}</p>
                  )}
                </div>
              </div>
            )
          }

          // ── System message (automated or leave-type) ──
          if (msg.is_system) {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '0.35rem 0' }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#94B7A2',
                  fontStyle: 'italic',
                  backgroundColor: '#F5F5F3',
                  border: '1px solid #E0E0DC',
                  borderRadius: '9999px',
                  padding: '0.35rem 1.1rem',
                  maxWidth: '440px',
                  textAlign: 'center',
                  display: 'block',
                  lineHeight: '1.5',
                }}>
                  {msg.content}
                </span>
              </div>
            )
          }

          // ── Regular chat bubble ──
          const isMe = msg.sender_id === currentUser?.id
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div className="msg-bubble" style={{ maxWidth: '400px', padding: '0.75rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', backgroundColor: isMe ? '#237371' : '#F5F5F3', color: isMe ? '#FEFFFF' : '#2A272A', borderBottomRightRadius: isMe ? '2px' : '1rem', borderBottomLeftRadius: isMe ? '1rem' : '2px', border: isMe ? 'none' : '1px solid #E0E0DC' }}>
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

      {/* ── Input bar — active unless conversation was ended by a leave ── */}
      {isEnded ? (
        <div style={{ padding: '1rem 2.5rem', borderTop: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0, textAlign: 'center' }}>
          <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>This conversation has ended.</p>
        </div>
      ) : (
        <form className="msg-input-bar" onSubmit={handleSend} style={{ padding: '1rem 2.5rem', borderTop: '1px solid #E0E0DC', backgroundColor: '#F5F5F3', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
          <input
            className="msg-input"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none' }}
          />
          <button
            className="msg-send-btn"
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{ backgroundColor: sending || !newMessage.trim() ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            Send
          </button>
        </form>
      )}

      {/* ── Leave-chat confirmation modal ── */}
      {leaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.45)' }} onClick={() => !leaving && setLeaveModal(false)} />
          <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2A272A' }}>Leave this exchange?</h2>
            <p style={{ color: '#2A272A', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '0.5rem' }}>
              This will <strong>cancel the exchange</strong> and reopen the post so the other person can find a new match.
            </p>
            <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleLeaveChat}
                disabled={leaving}
                style={{ flex: 1, padding: '0.875rem', backgroundColor: leaving ? '#E0E0DC' : '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: leaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {leaving ? 'Leaving…' : 'Yes, leave and cancel'}
              </button>
              <button
                onClick={() => setLeaveModal(false)}
                disabled={leaving}
                style={{ padding: '0.875rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: leaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hour-request modal ── */}
      {hourModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
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
