'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const channelRef = useRef(null)

  const fetchNotifications = useCallback(async (uid) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
  }, [])

  const subscribeNotifications = useCallback((uid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${uid}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 30))
      })
      .subscribe()
    channelRef.current = ch
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      fetchNotifications(user.id)
      subscribeNotifications(user.id)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null)
        setNotifications([])
        if (channelRef.current) supabase.removeChannel(channelRef.current)
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id)
        fetchNotifications(session.user.id)
        subscribeNotifications(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchNotifications, subscribeNotifications])

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }, [userId])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, userId }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
