'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function OrgRejected() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('account_type, org_status').eq('id', user.id).single()
      if (profile?.account_type !== 'organization') { router.push('/dashboard'); return }
      if (profile?.org_status === 'approved') { router.push('/org-dashboard'); return }
      if (profile?.org_status === 'pending') { router.push('/org-pending'); return }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', marginBottom: '2.5rem' }}>
        <Image src="/acc-logo.png" alt="ACC Logo" width={60} height={60} />
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A', marginTop: '0.5rem' }}>ACC Timebank</span>
      </Link>

      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fdf0ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
          ✖️
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Application Not Approved
        </h1>
        <p style={{ color: '#94B7A2', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Unfortunately, your organization account application was not approved at this time.
        </p>
        <p style={{ color: '#94B7A2', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          If you believe this was an error or would like to appeal, please reach out to the ACC Timebank administrators directly.
        </p>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          style={{ padding: '0.75rem 2rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Log Out
        </button>
      </div>
    </main>
  )
}
