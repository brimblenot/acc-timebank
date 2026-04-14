'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminBanner() {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  const clearAdminState = useCallback(() => {
    setIsAdmin(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminMode')
    }
  }, [])

  const checkAdmin = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, account_type')
      .eq('id', userId)
      .single()
    // Only show banner for confirmed admin members — never for org accounts or regular members
    if (data?.is_admin === true && data?.account_type !== 'organization') {
      setIsAdmin(true)
    } else {
      clearAdminState()
    }
  }, [clearAdminState])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        clearAdminState()
        setSessionChecked(true)
        return
      }
      await checkAdmin(session.user.id)
      setSessionChecked(true)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearAdminState()
        setSessionChecked(true)
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkAdmin(session.user.id)
        setSessionChecked(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAdmin, clearAdminState])

  // Don't render until the session check resolves to avoid flicker
  if (!sessionChecked) return null

  const hidden =
    !isAdmin ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/suspended'

  if (hidden) return null

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      width: '100%',
      backgroundColor: '#237371',
      color: '#FEFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2.5rem',
      height: '36px',
      fontSize: '0.78rem',
      fontWeight: 600,
      boxSizing: 'border-box',
      flexShrink: 0,
    }}>
      <span style={{ opacity: 0.9, letterSpacing: '0.01em' }}>You are viewing member mode</span>
      <button
        onClick={() => router.push('/admin')}
        style={{
          backgroundColor: 'rgba(255,255,255,0.18)',
          color: '#FEFFFF',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '0.2rem 0.75rem',
          borderRadius: '0.35rem',
          border: '1px solid rgba(255,255,255,0.35)',
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Admin Panel →
      </button>
    </div>
  )
}
