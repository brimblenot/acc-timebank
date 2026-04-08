'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePathname, useRouter } from 'next/navigation'

export default function FloatingMessageButton() {
  const [show, setShow] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setShow(true)
      await fetchUnreadCount(user.id)
    }
    init()
  }, [pathname])

  const fetchUnreadCount = async (userId) => {
    try {
      const { data: asApplicant } = await supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', userId)
        .eq('status', 'approved')

      const { data: myPosts } = await supabase
        .from('service_posts')
        .select('id')
        .eq('poster_id', userId)

      let posterAppIds = []
      if (myPosts?.length) {
        const { data: posterApps } = await supabase
          .from('applications')
          .select('id')
          .eq('status', 'approved')
          .in('post_id', myPosts.map(p => p.id))
        posterAppIds = posterApps?.map(a => a.id) || []
      }

      const allAppIds = [
        ...(asApplicant?.map(a => a.id) || []),
        ...posterAppIds,
      ]

      if (!allAppIds.length) { setUnreadCount(0); return }

      const { data: reads, error: readsError } = await supabase
        .from('conversation_reads')
        .select('application_id, last_read_at')
        .eq('user_id', userId)
        .in('application_id', allAppIds)

      if (readsError) { setUnreadCount(0); return }

      const readsMap = {}
      reads?.forEach(r => { readsMap[r.application_id] = r.last_read_at })

      const { data: msgs } = await supabase
        .from('messages')
        .select('application_id, created_at')
        .in('application_id', allAppIds)
        .neq('sender_id', userId)

      let total = 0
      msgs?.forEach(m => {
        const lastRead = readsMap[m.application_id]
        if (!lastRead || new Date(m.created_at) > new Date(lastRead)) total++
      })

      setUnreadCount(total)
    } catch {
      setUnreadCount(0)
    }
  }

  if (!show) return null
  if (pathname === '/dashboard' || pathname?.startsWith('/messages')) return null

  return (
    <button
      onClick={() => router.push('/dashboard')}
      title="Messages"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 40,
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#237371',
        color: '#FEFFFF',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(35,115,113,0.35)',
      }}
    >
      💬
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          backgroundColor: '#c0392b',
          color: '#FEFFFF',
          borderRadius: '9999px',
          fontSize: '0.65rem',
          fontWeight: 700,
          minWidth: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          border: '2px solid #FEFFFF',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
