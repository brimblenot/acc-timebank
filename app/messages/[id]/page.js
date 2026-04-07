'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function MessageThread() {
  const router = useRouter()
  const { id } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)

      const { data: app } = await supabase
        .from('applications')
        .select(`
          *,
          service_posts (
            id, title, hours_required, poster_id,
            profiles (id, full_name, username)
          ),
          profiles (id, full_name, username)
        `)
        .eq('id', id)
        .single()

      if (!app || app.status !== 'approved') {
        router.push('/dashboard')
        return
      }

      setApplication(app)

      // Load initial messages
      const { data: initialMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: true })

      messagesRef.current = initialMessages || []
      setMessages(initialMessages || [])
      setLoading(false)

      // Realtime subscription
      const channel = supabase
        .channel(`room-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `application_id=eq.${id}`,
          },
          (payload) => {
            const newMsg = payload.new
            const already = messagesRef.current.find(m => m.id === newMsg.id)
            if (!already) {
              messagesRef.current = [...messagesRef.current, newMsg]
              setMessages([...messagesRef.current])
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    init()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return
    setSending(true)

    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      application_id: id,
      sender_id: currentUser.id,
      content,
    })

    setSending(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading...</p>
      </main>
    )
  }

  const otherPerson = currentUser?.id === application.service_posts.poster_id
    ? application.profiles
    : application.service_posts.profiles

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800 shrink-0">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </Link>
        <Link href="/my-applications" className="text-sm text-stone-400 hover:text-white transition">
          ← Back
        </Link>
      </nav>

      {/* Thread Header */}
      <div className="px-8 py-4 border-b border-stone-800 bg-stone-900 shrink-0">
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Service Exchange</p>
        <h1 className="font-bold text-lg">{application.service_posts.title}</h1>
        <p className="text-stone-400 text-sm">
          Chatting with {otherPerson?.full_name || otherPerson?.username} · {application.service_posts.hours_required} hours
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-400">No messages yet. Say hello!</p>
            <p className="text-stone-500 text-sm mt-2">
              Your contact info stays private — coordinate everything here.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === currentUser?.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm ${
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

      {/* Input */}
      <form onSubmit={handleSend} className="px-6 py-4 border-t border-stone-800 bg-stone-900 shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-black font-bold rounded-xl transition"
          >
            Send
          </button>
        </div>
      </form>

    </main>
  )
}