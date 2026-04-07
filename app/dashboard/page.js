'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [stats, setStats] = useState({
    activePosts: 0,
    servicesGiven: 0,
    servicesReceived: 0,
  })
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
    // Active posts — open or in_progress
    const { count: activePosts } = await supabase
      .from('service_posts')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .in('status', ['open', 'in_progress'])

    // Services given — completed posts where user was the applicant
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

    // Services received — completed posts where user was the poster
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
      .select(`
        id, status,
        service_posts (id, title, hours_required, poster_id,
          profiles (full_name, username)
        )
      `)
      .eq('applicant_id', userId)
      .eq('status', 'approved')

    const postIds = await supabase
      .from('service_posts')
      .select('id')
      .eq('poster_id', userId)
      .then(r => (r.data || []).map(p => p.id))

    const { data: asPoster } = postIds.length > 0 ? await supabase
      .from('applications')
      .select(`
        id, status, applicant_id,
        service_posts (id, title, hours_required, poster_id),
        profiles (full_name, username)
      `)
      .eq('status', 'approved')
      .in('post_id', postIds) : { data: [] }

    const all = [
      ...(asApplicant || []).map(a => ({
        id: a.id,
        title: a.service_posts?.title,
        otherPerson: a.service_posts?.profiles?.full_name || a.service_posts?.profiles?.username,
      })),
      ...(asPoster || []).map(a => ({
        id: a.id,
        title: a.service_posts?.title,
        otherPerson: a.profiles?.full_name || a.profiles?.username,
      })),
    ]

    setConversations(all)
  }

  const openConversation = async (convo) => {
    setActiveConvo(convo)
    setMessages([])
    messagesRef.current = []

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', convo.id)
      .order('created_at', { ascending: true })

    messagesRef.current = data || []
    setMessages(data || [])

    const channel = supabase
      .channel(`dashboard-room-${convo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `application_id=eq.${convo.id}`,
      }, (payload) => {
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

    await supabase.from('messages').insert({
      application_id: activeConvo.id,
      sender_id: profile.id,
      content,
    })

    setSending(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <span className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </span>
        <div className="flex gap-4 items-center">
          <Link href="/posts" className="text-sm text-stone-400 hover:text-white transition">Browse</Link>
          <Link href="/my-applications" className="text-sm text-stone-400 hover:text-white transition">My Applications</Link>
          <Link href="/my-posts" className="text-sm text-stone-400 hover:text-white transition">My Posts</Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-stone-400 hover:text-white transition"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">
            Welcome, {profile?.full_name || profile?.username} 👋
          </h1>
          <p className="text-stone-400">Here's your community exchange dashboard.</p>
        </div>

        {/* Hour Balance Card */}
        <div className="bg-emerald-900 border border-emerald-700 rounded-2xl p-8 mb-8 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-sm font-medium uppercase tracking-widest mb-1">Hour Balance</p>
            <p className="text-6xl font-bold text-white">{profile?.hour_balance ?? 0}</p>
            <p className="text-emerald-400 mt-1 text-sm">hours available to spend</p>
          </div>
          <div className="text-7xl">⏱️</div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link href="/posts" className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-5 text-left transition block">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-bold text-sm mb-1">Browse</h3>
            <p className="text-stone-400 text-xs">See community requests</p>
          </Link>

          <Link href="/posts/new" className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-5 text-left transition block">
            <div className="text-2xl mb-3">✏️</div>
            <h3 className="font-bold text-sm mb-1">Post Request</h3>
            <p className="text-stone-400 text-xs">Ask for help</p>
          </Link>

          <Link href="/my-applications" className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-5 text-left transition block">
            <div className="text-2xl mb-3">🙋</div>
            <h3 className="font-bold text-sm mb-1">My Applications</h3>
            <p className="text-stone-400 text-xs">Track your offers</p>
          </Link>

          <Link href="/my-posts" className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-5 text-left transition block">
            <div className="text-2xl mb-3">📬</div>
            <h3 className="font-bold text-sm mb-1">My Posts</h3>
            <p className="text-stone-400 text-xs">Review applicants</p>
          </Link>

          <button
            onClick={() => setMessagesOpen(true)}
            className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-5 text-left transition"
          >
            <div className="text-2xl mb-3">💬</div>
            <h3 className="font-bold text-sm mb-1">Messages</h3>
            <p className="text-stone-400 text-xs">
              {conversations.length > 0 ? `${conversations.length} active` : 'No active chats'}
            </p>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">{stats.activePosts}</p>
            <p className="text-stone-400 text-sm mt-1">Active Posts</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">{stats.servicesGiven}</p>
            <p className="text-stone-400 text-sm mt-1">Services Given</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">{stats.servicesReceived}</p>
            <p className="text-stone-400 text-sm mt-1">Services Received</p>
          </div>
        </div>

      </div>

      {/* Full Messages Overlay */}
      {messagesOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black bg-opacity-60"
            onClick={() => { setMessagesOpen(false); setActiveConvo(null) }}
          />

          <div className="relative m-auto w-full max-w-4xl h-[80vh] bg-stone-900 border border-stone-700 rounded-2xl flex overflow-hidden shadow-2xl">

            {/* Conversation List */}
            <div className="w-72 border-r border-stone-800 flex flex-col shrink-0">
              <div className="px-5 py-4 border-b border-stone-800 flex justify-between items-center">
                <div>
                  <h2 className="font-bold">Messages</h2>
                  <p className="text-stone-400 text-xs">{conversations.length} conversations</p>
                </div>
                <button
                  onClick={() => { setMessagesOpen(false); setActiveConvo(null) }}
                  className="text-stone-400 hover:text-white text-2xl leading-none transition"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <p className="text-stone-400 text-sm">No conversations yet.</p>
                  </div>
                ) : (
                  conversations.map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => openConversation(convo)}
                      className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-800 transition text-left border-b border-stone-800 ${
                        activeConvo?.id === convo.id ? 'bg-stone-800 border-l-2 border-l-emerald-500' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {convo.otherPerson?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{convo.otherPerson}</p>
                        <p className="text-stone-400 text-xs truncate mt-0.5">{convo.title}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col min-w-0">
              {!activeConvo ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <div className="text-5xl mb-4">💬</div>
                  <p className="text-stone-400">Select a conversation to start chatting</p>
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-stone-800 shrink-0">
                    <p className="font-bold">{activeConvo.otherPerson}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{activeConvo.title}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-stone-400 text-sm">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.sender_id === profile?.id
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                : 'bg-stone-800 text-stone-100 rounded-bl-sm'
                            }`}>
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-emerald-200' : 'text-stone-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <form onSubmit={handleSend} className="px-6 py-4 border-t border-stone-800 shrink-0">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-black font-bold rounded-xl transition text-sm"
                      >
                        Send
                      </button>
                    </div>
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