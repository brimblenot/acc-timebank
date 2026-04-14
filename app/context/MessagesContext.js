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
  const [pendingApplicantCount, setPendingApplicantCount] = useState(0)
  const [newApprovalCount, setNewApprovalCount] = useState(0)
  const [approving, setApproving] = useState(null)
  const [hourError, setHourError] = useState(null)
  const messagesRef = useRef([])
  const channelRef = useRef(null)
  const badgeChannelRef = useRef(null)

  // A leave-type system message has sender_id set (the person who left).
  // Automated hour-request system messages have sender_id = null.
  const isLeaveMessage = (m) => m.is_system && m.sender_id !== null

  // Strip already-resolved hour-request messages so they never reappear.
  const filterMessages = (msgs) =>
    msgs.filter(m => !m.is_hour_request || m.hour_request_status === 'pending')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single()
      setUserDisplayName(prof?.full_name || prof?.username || '')
      fetchConversations(user.id)
      fetchBadgeCounts(user.id)
      subscribeBadges(user.id)
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
        setPendingApplicantCount(0)
        setNewApprovalCount(0)
        if (badgeChannelRef.current) supabase.removeChannel(badgeChannelRef.current)
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id)
        fetchConversations(session.user.id)
        fetchBadgeCounts(session.user.id)
        subscribeBadges(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const subscribeBadges = (uid) => {
    if (badgeChannelRef.current) supabase.removeChannel(badgeChannelRef.current)
    const ch = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchBadgeCounts(uid))
      .subscribe()
    badgeChannelRef.current = ch
  }

  const fetchBadgeCounts = async (uid) => {
    const { data: myPosts } = await supabase
      .from('service_posts')
      .select('id')
      .eq('poster_id', uid)

    const myPostIds = (myPosts || []).map(p => p.id)

    if (myPostIds.length > 0) {
      const { count } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('post_id', myPostIds)
        .eq('status', 'pending')
      setPendingApplicantCount(count || 0)
    } else {
      setPendingApplicantCount(0)
    }

    const { data: approvedApps } = await supabase
      .from('applications')
      .select('id')
      .eq('applicant_id', uid)
      .eq('status', 'approved')

    const approvedIds = (approvedApps || []).map(a => a.id)

    if (approvedIds.length > 0) {
      try {
        const { data: reads } = await supabase
          .from('conversation_reads')
          .select('application_id')
          .eq('user_id', uid)
          .in('application_id', approvedIds)
        const seenIds = new Set((reads || []).map(r => r.application_id))
        setNewApprovalCount(approvedIds.filter(id => !seenIds.has(id)).length)
      } catch {
        setNewApprovalCount(approvedIds.length)
      }
    } else {
      setNewApprovalCount(0)
    }
  }

  const fetchConversations = async (uid) => {
    const { data: asApplicant } = await supabase
      .from('applications')
      .select(`id, status, applicant_id, service_posts (id, title, hours_required, poster_id, profiles (full_name, username))`)
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
        poster_id: a.service_posts?.poster_id,
        applicant_id: uid,
        post_id: a.service_posts?.id,
        hours_required: a.service_posts?.hours_required,
      })),
      ...(asPoster || []).map(a => ({
        id: a.id,
        title: a.service_posts?.title,
        otherPerson: a.profiles?.full_name || a.profiles?.username,
        poster_id: uid,
        applicant_id: a.applicant_id,
        post_id: a.service_posts?.id,
        hours_required: a.service_posts?.hours_required,
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
    setHourError(null)

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    if (userId) {
      try {
        await supabase
          .from('conversation_reads')
          .upsert({ user_id: userId, application_id: convo.id, last_read_at: new Date().toISOString() })
        fetchBadgeCounts(userId)
      } catch { }
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', convo.id)
      .order('created_at', { ascending: true })

    const filtered = filterMessages(data || [])
    messagesRef.current = filtered
    setMessages(filtered)

    // Only leave-type system messages (sender_id != null) end the conversation.
    if ((data || []).some(isLeaveMessage)) {
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
        // Discard already-resolved hour requests
        if (newMsg.is_hour_request && newMsg.hour_request_status !== 'pending') return
        if (!messagesRef.current.find(m => m.id === newMsg.id)) {
          messagesRef.current = [...messagesRef.current, newMsg]
          setMessages([...messagesRef.current])
          // Only leave messages end the conversation; automated system messages do not
          if (isLeaveMessage(newMsg)) {
            setEndedConvos(prev => ({ ...prev, [newMsg.application_id]: true }))
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `application_id=eq.${convo.id}`,
      }, (payload) => {
        const updated = payload.new
        // When an hour request is resolved, remove it from state
        if (updated.is_hour_request && updated.hour_request_status !== 'pending') {
          messagesRef.current = messagesRef.current.filter(m => m.id !== updated.id)
        } else {
          messagesRef.current = messagesRef.current.map(m => m.id === updated.id ? updated : m)
        }
        setMessages([...messagesRef.current])
      })
      .subscribe()

    channelRef.current = channel
  }

  // Full exchange cancellation — distinguishes poster vs applicant.
  const leaveConversation = async (convo) => {
    if (!userId || !convo) return
    const isUserApplicant = userId === convo.applicant_id
    const myName = userDisplayName || 'Someone'
    const postId = convo.post_id

    // 1. Cancel application
    await supabase.from('applications').update({ status: 'cancelled' }).eq('id', convo.id)

    if (isUserApplicant) {
      // Applicant leaves: reopen post, decline other pending apps
      await supabase.from('service_posts').update({ status: 'open' }).eq('id', postId)
      await supabase
        .from('applications')
        .update({ status: 'declined' })
        .eq('post_id', postId)
        .eq('status', 'pending')
        .neq('id', convo.id)
      await supabase.from('messages').insert({
        application_id: convo.id,
        sender_id: userId,
        content: `${myName} has left this exchange. The post has been reopened for new applicants.`,
        is_system: true,
      })
    } else {
      // Poster leaves: close the post entirely
      await supabase.from('service_posts').update({ status: 'cancelled' }).eq('id', postId)
      await supabase.from('messages').insert({
        application_id: convo.id,
        sender_id: userId,
        content: `${myName} has cancelled this exchange and closed the post.`,
        is_system: true,
      })
    }

    setEndedConvos(prev => ({ ...prev, [convo.id]: true }))
    fetchConversations(userId)
  }

  // ── Hour request approval / decline ──────────────────────────────────────────

  const approveHours = async (msg) => {
    if (approving || !activeConvo) return
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

    // Transfer hours via RPC (poster → applicant)
    const { error: rpcError } = await supabase.rpc('transfer_hours_for_request', {
      from_user: activeConvo.poster_id,
      to_user: activeConvo.applicant_id,
      amount: msg.hour_request_amount,
    })
    if (rpcError) {
      setHourError(rpcError.message)
      setApproving(null)
      return
    }

    // Fetch current hours to avoid stale-cache addition
    const { data: postData } = await supabase
      .from('service_posts')
      .select('hours_required')
      .eq('id', activeConvo.post_id)
      .single()
    const currentHours = postData?.hours_required ?? (activeConvo.hours_required || 0)
    const newHours = currentHours + msg.hour_request_amount

    await supabase.from('service_posts').update({ hours_required: newHours }).eq('id', activeConvo.post_id)
    setActiveConvo(prev => prev ? { ...prev, hours_required: newHours } : prev)

    // Mark request approved so it cannot be processed again
    await supabase.from('messages').update({ hour_request_status: 'approved' }).eq('id', msg.id)

    // Insert automated system message (sender_id = null → does NOT end conversation)
    await supabase.from('messages').insert({
      application_id: activeConvo.id,
      sender_id: null,
      content: `✓ ${msg.hour_request_amount} additional hour${msg.hour_request_amount !== 1 ? 's' : ''} approved and transferred. Thank you for your service.`,
      is_system: true,
    })

    // Remove request card from UI immediately
    messagesRef.current = messagesRef.current.filter(m => m.id !== msg.id)
    setMessages([...messagesRef.current])
    setApproving(null)
  }

  const declineHours = async (msg) => {
    if (approving || !activeConvo) return
    setHourError(null)
    setApproving(msg.id)

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
      application_id: activeConvo.id,
      sender_id: null,
      content: '✗ Additional hour request was declined.',
      is_system: true,
    })

    messagesRef.current = messagesRef.current.filter(m => m.id !== msg.id)
    setMessages([...messagesRef.current])
    setApproving(null)
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
      approveHours,
      declineHours,
      approving,
      hourError,
      refetchConversations: fetchConversations,
      pendingApplicantCount,
      newApprovalCount,
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
