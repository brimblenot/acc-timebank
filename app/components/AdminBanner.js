'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminBanner() {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      setIsAdmin(data?.is_admin === true)
    }
    check()
  }, [])

  // Only show on member-facing pages — not on admin, login, signup, suspended
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
