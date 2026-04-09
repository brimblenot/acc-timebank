'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMessages } from '../context/MessagesContext'
import { supabase } from '../lib/supabase'

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span style={{
      position: 'absolute',
      top: '-6px',
      right: '-10px',
      backgroundColor: '#c0392b',
      color: '#FEFFFF',
      borderRadius: '9999px',
      fontSize: '0.6rem',
      fontWeight: 700,
      minWidth: '16px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 3px',
      pointerEvents: 'none',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function NavLinks({ userId }) {
  const { pendingApplicantCount, newApprovalCount } = useMessages()
  const pathname = usePathname()
  const router = useRouter()

  const s = (href) => ({
    color: pathname === href ? '#2A272A' : '#94B7A2',
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: pathname === href ? 700 : 600,
  })

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <Link href="/posts" style={s('/posts')}>Browse</Link>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <Link href="/my-posts" style={s('/my-posts')}>My Posts</Link>
        <NavBadge count={pendingApplicantCount} />
      </span>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <Link href="/my-applications" style={s('/my-applications')}>My Applications</Link>
        <NavBadge count={newApprovalCount} />
      </span>
      <Link href="/history" style={s('/history')}>History</Link>
      <Link href="/members" style={s('/members')}>Members</Link>
      {userId && (
        <Link href={`/profile/${userId}`} style={s(`/profile/${userId}`)}>My Profile</Link>
      )}
      <button
        onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
        style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Log Out
      </button>
    </div>
  )
}
