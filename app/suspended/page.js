'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function SuspendedPage() {
  const router = useRouter()
  const [suspension, setSuspension] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('suspensions')
        .select('reason, suspended_until')
        .eq('user_id', user.id)
        .gt('suspended_until', new Date().toISOString())
        .maybeSingle()

      if (!data) {
        router.push('/dashboard')
        return
      }

      setSuspension(data)
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const isPermanent = new Date(suspension.suspended_until).getFullYear() > 2100
  const expiryDate = new Date(suspension.suspended_until).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const expiryTime = new Date(suspension.suspended_until).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

      <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', marginBottom: '2.5rem' }}>
        <Image src="/acc-logo.png" alt="ACC Logo" width={56} height={56} />
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A', marginTop: '0.5rem' }}>
          ACC Timebank
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '2.5rem', boxShadow: '0 4px 24px rgba(42,39,42,0.08)' }}>

        {/* Icon */}
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2A272A' }}>
          Account Suspended
        </h1>
        <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Your access to ACC Timebank has been temporarily restricted by a moderator.
        </p>

        {/* Reason */}
        <div style={{ backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c0392b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Reason</p>
          <p style={{ color: '#2A272A', fontSize: '0.9rem', lineHeight: 1.6 }}>{suspension.reason}</p>
        </div>

        {/* Expiry */}
        <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94B7A2', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {isPermanent ? 'Duration' : 'Suspended Until'}
          </p>
          {isPermanent ? (
            <p style={{ color: '#2A272A', fontSize: '0.9rem', fontWeight: 600 }}>Permanent</p>
          ) : (
            <p style={{ color: '#2A272A', fontSize: '0.9rem' }}>
              <strong>{expiryDate}</strong> at {expiryTime}
            </p>
          )}
        </div>

        <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.6, textAlign: 'center' }}>
          If you believe this is an error, please contact a community moderator directly.
        </p>

        <button
          onClick={handleLogOut}
          style={{ width: '100%', padding: '0.875rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Log Out
        </button>

      </div>
    </main>
  )
}
