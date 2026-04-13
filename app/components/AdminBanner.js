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

  // Only show on authenticated member pages — not on admin, login, signup, suspended
  const hidden =
    !isAdmin ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/suspended'

  if (hidden) return null

  return (
    <button
      onClick={() => router.push('/admin')}
      title="Go to Admin Panel"
      style={{
        position: 'fixed',
        bottom: '5rem',
        right: '1.5rem',
        zIndex: 200,
        backgroundColor: '#237371',
        color: '#FEFFFF',
        fontWeight: 700,
        fontSize: '0.78rem',
        padding: '0.55rem 1rem',
        borderRadius: '9999px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        boxShadow: '0 4px 16px rgba(35,115,113,0.4)',
        letterSpacing: '0.01em',
        userSelect: 'none',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
      </svg>
      Admin Panel
    </button>
  )
}
