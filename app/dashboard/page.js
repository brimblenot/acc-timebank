'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [stats, setStats] = useState({ activePosts: 0, servicesGiven: 0, servicesReceived: 0 })
  const bottomRef = useRef(null)
  const messagesRef = useRef([])
  const channelRef = useRef(null)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      fetchConversations(user.id)
      fetchStats(user.id)
      setLoading(false)
    }
    getProfile()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchStats = async (userId) => {
    const { count: activePosts } = await supabase
      .from('service_posts')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .in('status', ['open', 'in_progress'])

    const { count: servicesGiven } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('applicant_id', userId)
      .eq('status', 'approved')
      .in('post_id',
        await supabase
          .from('service_posts')
          .select('id')
          .eq('status', 'completed')
          .then(r => (r.data || []).map(p => p.id))
      )

    const { count: servicesReceived } = await supabase
      .from('service_posts')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .eq('status', 'completed')

    setStats({
      activePosts: activePosts || 0,
      servicesGiven: servicesGiven || 0,
      servicesReceived: servicesReceived || 0,
    })
  }

  const fetchConversations = async (userId) => {
    const { data: asApplicant } = await supabase
      .from('applications')
      .select(`id, status, service_posts (id, title, hours_required, poster_id, profiles (full_name, username))`)
      .eq('applicant_id', userId)
      .eq('status', 'approved')

    const postIds = await supabase
      .from('service_posts')
      .select('id')
      .eq('poster_id', userId)
      .then(r => (r.data || []).map(p => p.id))

    const { data: asPoster } = postIds.length > 0 ? await supabase
      .from('applications')
      .select(`id, status, applicant_id, service_posts (id, title, hours_required, poster_id), profiles (full_name, username)`)
      .eq('status', 'approved')
      .in('post_id', postIds) : { data: [] }

    const all = [
      ...(asApplicant || []).map(a => ({ id: a.id, title: a.service_posts?.title, otherPerson: a.service_posts?.profiles?.full_name || a.service_posts?.profiles?.username })),
      ...(asPoster || []).map(a => ({ id: a.id, title: a.service_posts?.title, otherPerson: a.profiles?.full_name || a.profiles?.username })),
    ]
    setConversations(all)
  }

  const openConversation = async (convo) => {
    setActiveConvo(convo)
    setMessages([])
    messagesRef.current = []

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', convo.id)
      .order('created_at', { ascending: true })

    messagesRef.current = data || []
    setMessages(data || [])

    const channel = supabase
      .channel(`dashboard-room-${convo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${convo.id}` }, (payload) => {
        const newMsg = payload.new
        const already = messagesRef.current.find(m => m.id === newMsg.id)
        if (!already) {
          messagesRef.current = [...messagesRef.current, newMsg]
          setMessages([...messagesRef.current])
        }
      })
      .subscribe()

    channelRef.current = channel
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConvo || !profile) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({ application_id: activeConvo.id, sender_id: profile.id, content })
    setSending(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94B7A2' }}>Loading...</p>
      </main>
    )
  }

  const quickActions = [
    { href: '/posts', icon: '📋', label: 'Browse', sub: 'See community requests' },
    { href: '/posts/new', icon: '✏️', label: 'Post Request', sub: 'Ask for help' },
    { href: '/my-applications', icon: '🙋', label: 'My Applications', sub: 'Track your offers' },
    { href: '/my-posts', icon: '📬', label: 'My Posts', sub: 'Review applicants' },
  ]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>
            ACC Timebank
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Browse</Link>
          <Link href="/my-applications" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Applications</Link>
          <Link href="/my-posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Posts</Link>
          <button onClick={handleLogout} style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#2A272A' }}>
            Welcome, {profile?.full_name || profile?.username} 👋
          </h1>
          <p style={{ color: '#94B7A2' }}>Here's your community exchange dashboard.</p>
        </div>

        {/* Hour Balance Card */}
        <div style={{ backgroundColor: '#237371', borderRadius: '1rem', padding: '2.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#94B7A2', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hour Balance</p>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '5rem', fontWeight: 700, color: '#FEFFFF', lineHeight: 1 }}>{profile?.hour_balance ?? 0}</p>
            <p style={{ color: '#94B7A2', marginTop: '0.5rem', fontSize: '0.875rem' }}>hours available to spend</p>
          </div>
          <div style={{ fontSize: '5rem' }}>⏱️</div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {quickActions.map(action => (
            <Link key={action.href} href={action.href} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{action.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{action.label}</h3>
              <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{action.sub}</p>
            </Link>
          ))}
          <button
            onClick={() => setMessagesOpen(true)}
            style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>💬</div>
            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem', color: '#2A272A' }}>Messages</h3>
            <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{conversations.length > 0 ? `${conversations.length} active` : 'No active chats'}</p>
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Active Posts', value: stats.activePosts },
            { label: 'Services Given', value: stats.servicesGiven },
            { label: 'Services Received', value: stats.servicesReceived },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, color: '#237371' }}>{stat.value}</p>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Messages Overlay */}
      {messagesOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={() => { setMessagesOpen(false); setActiveConvo(null) }} />
          <div style={{ position: 'relative', margin: 'auto', width: '100%', maxWidth: '900px', height: '80vh', backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', display: 'flex', overflow: 'hidden', boxShadow: '0 8px 40px rgba(42,39,42,0.15)' }}>

            {/* Conversation List */}
            <div style={{ width: '280px', borderRight: '1px solid #E0E0DC', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#2A272A' }}>Messages</h2>
                  <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{conversations.length} conversations</p>
                </div>
                <button onClick={() => { setMessagesOpen(false); setActiveConvo(null) }} style={{ color: '#94B7A2', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
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
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', background: activeConvo?.id === convo.id ? '#F5F5F3' : 'none', border: 'none', borderBottom: '1px solid #E0E0DC', cursor: 'pointer', textAlign: 'left', borderLeft: activeConvo?.id === convo.id ? '3px solid #237371' : '3px solid transparent' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#237371', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEFFFF', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {convo.otherPerson?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#2A272A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.otherPerson}</p>
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
                      const isMe = msg.sender_id === profile?.id
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
                      onChange={(e) => setNewMessage(e.target.value)}
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
      )}

    </main>
  )
}