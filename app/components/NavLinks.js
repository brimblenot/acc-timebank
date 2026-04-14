'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMessages } from '../context/MessagesContext'
import { supabase } from '../lib/supabase'
import NotificationBell from './NotificationBell'

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
  const [menuOpen, setMenuOpen] = useState(false)

  const s = (href) => ({
    color: pathname === href ? '#2A272A' : '#94B7A2',
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: pathname === href ? 700 : 600,
  })

  const handleSignOut = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* ── Desktop nav links ─────────────────────────── */}
      <div className="nav-links">
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
        <Link href="/events" style={s('/events')}>Events</Link>
        <Link href="/members" style={s('/members')}>Members</Link>
        {userId && (
          <Link href={`/profile/${userId}`} style={s(`/profile/${userId}`)}>My Profile</Link>
        )}
        {userId && <NotificationBell />}
        <button
          onClick={handleSignOut}
          style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Log Out
        </button>
      </div>

      {/* ── Mobile hamburger button ────────────────────── */}
      <button
        className="nav-hamburger-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* ── Mobile slide-out menu ──────────────────────── */}
      {menuOpen && (
        <div className="nav-mobile-overlay">
          <div className="nav-mobile-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="nav-mobile-panel">

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E0E0DC', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A' }}>Menu</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {userId && <NotificationBell />}
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94B7A2', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Nav items */}
            <Link href="/posts" onClick={() => setMenuOpen(false)}>Browse</Link>
            <Link href="/my-posts" onClick={() => setMenuOpen(false)} style={{ position: 'relative' }}>
              My Posts
              {pendingApplicantCount > 0 && (
                <span style={{ marginLeft: '0.5rem', backgroundColor: '#c0392b', color: '#FEFFFF', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', verticalAlign: 'middle' }}>
                  {pendingApplicantCount}
                </span>
              )}
            </Link>
            <Link href="/my-applications" onClick={() => setMenuOpen(false)}>
              My Applications
              {newApprovalCount > 0 && (
                <span style={{ marginLeft: '0.5rem', backgroundColor: '#c0392b', color: '#FEFFFF', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', verticalAlign: 'middle' }}>
                  {newApprovalCount}
                </span>
              )}
            </Link>
            <Link href="/history" onClick={() => setMenuOpen(false)}>History</Link>
            <Link href="/events" onClick={() => setMenuOpen(false)}>Events</Link>
            <Link href="/members" onClick={() => setMenuOpen(false)}>Members</Link>
            {userId && (
              <Link href={`/profile/${userId}`} onClick={() => setMenuOpen(false)}>My Profile</Link>
            )}
            <button className="nav-mobile-link" onClick={handleSignOut}>Log Out</button>
          </div>
        </div>
      )}
    </>
  )
}
