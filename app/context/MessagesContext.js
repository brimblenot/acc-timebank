'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MessagesContext = createContext(null)

export function MessagesProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadMap, setUnreadMap] = useState({})
  const [endedConvos, setEndedConvos] = useState({})
  const messagesRef = useRef([])
  const channelRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single()
      setUserDisplayName(prof?.full_name || prof?.username || '')
      fetchConversations(user.id)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null)
        setConversations([])
        setIsOpen(false)
        setActiveConvo(null)
        setMessages([])
        setUnreadMap({})
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id)
        fetchConversations(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchConversations = async (uid) => {
    const { data: asApplicant } = await supabase
      .from('applications')
      .select(`id, status, service_posts (id, title, hours_required, poster_id, profiles (full_name, username))`)
      .eq('applicant_id', uid)
      .eq('status', 'approved')

    const postIds = await supabase
      .from('service_posts')
      .select('id')
      .eq('poster_id', uid)
      .then(r => (r.data || []).map(p => p.id))

    const { data: asPoster } = postIds.length > 0 ? await supabase
      .from('applications')
      .select(`id, status, applicant_id, service_posts (id, title, hours_required, poster_id), profiles (full_name, username)`)
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

    if (!all.length) return
    try {
      const appIds = all.map(c => c.id)

      const { data: reads, error } = await supabase
        .from('conversation_reads')
        .select('application_id, last_read_at')
        .eq('user_id', uid)
        .in('application_id', appIds)

      if (error) return

      const readsMap = {}
      reads?.forEach(r => { readsMap[r.application_id] = r.last_read_at })

      const { data: msgs } = await supabase
        .from('messages')
        .select('application_id, created_at, sender_id')
        .in('application_id', appIds)
        .neq('sender_id', uid)

      const counts = {}
      msgs?.forEach(m => {
        const lastRead = readsMap[m.application_id]
        if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
          counts[m.application_id] = (counts[m.application_id] || 0) + 1
        }
      })
      setUnreadMap(counts)
    } catch { /* conversation_reads table may not exist yet */ }
  }

  const openMessages = useCallback(() => setIsOpen(true), [])
  const closeMessages = useCallback(() => {
    setIsOpen(false)
    setActiveConvo(null)
  }, [])

  const openConversation = async (convo) => {
    setActiveConvo(convo)
    setMessages([])
    messagesRef.current = []
    setUnreadMap(prev => ({ ...prev, [convo.id]: 0 }))

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    if (userId) {
      try {
        await supabase
          .from('conversation_reads')
          .upsert({ user_id: userId, application_id: convo.id, last_read_at: new Date().toISOString() })
      } catch { }
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', convo.id)
      .order('created_at', { ascending: true })

    messagesRef.current = data || []
    setMessages(data || [])

    // Detect if conversation was already ended
    if ((data || []).some(m => m.is_system)) {
      setEndedConvos(prev => ({ ...prev, [convo.id]: true }))
    }

    const channel = supabase
      .channel(`global-room-${convo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `application_id=eq.${convo.id}`,
      }, (payload) => {
        const newMsg = payload.new
        if (!messagesRef.current.find(m => m.id === newMsg.id)) {
          messagesRef.current = [...messagesRef.current, newMsg]
          setMessages([...messagesRef.current])
          if (newMsg.is_system) {
            setEndedConvos(prev => ({ ...prev, [newMsg.application_id]: true }))
          }
        }
      })
      .subscribe()

    channelRef.current = channel
  }

  const leaveConversation = async (convo) => {
    if (!userId || !convo) return
    const name = userDisplayName || 'Someone'
    await supabase.from('messages').insert({
      application_id: convo.id,
      sender_id: userId,
      content: `${name} has left this conversation.`,
      is_system: true,
    })
    setEndedConvos(prev => ({ ...prev, [convo.id]: true }))
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !activeConvo || !userId) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({ application_id: activeConvo.id, sender_id: userId, content })
    setSending(false)
  }

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)

  return (
    <MessagesContext.Provider value={{
      userId,
      isOpen,
      openMessages,
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
      totalUnread,
      endedConvos,
      leaveConversation,
      refetchConversations: fetchConversations,
    }}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider')
  return ctx
}
