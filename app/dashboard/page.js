'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useMessages } from '../context/MessagesContext'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activePosts: 0, servicesGiven: 0, servicesReceived: 0 })

  const { openMessages, conversations, totalUnread } = useMessages()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      fetchStats(user.id)
      setLoading(false)
    }
    getProfile()
  }, [])

  const fetchStats = async (userId) => {
    const { count: activePosts } = await supabase
      .from('service_posts')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .in('status', ['open', 'in_progress'])

    const { count: servicesGiven } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('applicant_id', userId)
      .eq('status', 'approved')
      .in('post_id',
        await supabase
          .from('service_posts')
          .select('id')
          .eq('status', 'completed')
          .then(r => (r.data || []).map(p => p.id))
      )

    const { count: servicesReceived } = await supabase
      .from('service_posts')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', userId)
      .eq('status', 'completed')

    setStats({
      activePosts: activePosts || 0,
      servicesGiven: servicesGiven || 0,
      servicesReceived: servicesReceived || 0,
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94B7A2' }}>Loading...</p>
      </main>
    )
  }

  const quickActions = [
    { href: '/posts', icon: '📋', label: 'Browse', sub: 'See community requests' },
    { href: '/posts/new', icon: '✏️', label: 'Post Request', sub: 'Ask for help' },
    { href: '/my-applications', icon: '🙋', label: 'My Applications', sub: 'Track your offers' },
    { href: '/my-posts', icon: '📬', label: 'My Posts', sub: 'Review applicants' },
    { href: '/members', icon: '👥', label: 'Members', sub: 'Find community members' },
  ]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>
            ACC Timebank
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Browse</Link>
          <Link href="/my-posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Posts</Link>
          <Link href="/my-applications" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Applications</Link>
          <Link href="/members" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Members</Link>
          {profile?.id && (
            <Link href={`/profile/${profile.id}`} style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Profile</Link>
          )}
          <button onClick={handleLogout} style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem', color: '#2A272A' }}>
            Welcome, {profile?.full_name || profile?.username} 👋
          </h1>
          <p style={{ color: '#94B7A2' }}>Here's your community exchange dashboard.</p>
        </div>

        {/* Hour Balance Card */}
        <div style={{ backgroundColor: '#237371', borderRadius: '1rem', padding: '2.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#94B7A2', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hour Balance</p>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '5rem', fontWeight: 700, color: '#FEFFFF', lineHeight: 1 }}>{profile?.hour_balance ?? 0}<span style={{ fontSize: '1.75rem', fontWeight: 400, marginLeft: '0.35rem' }}>hrs</span></p>
            <p style={{ color: '#94B7A2', marginTop: '0.5rem', fontSize: '0.875rem' }}>available to spend</p>
          </div>
          <div style={{ fontSize: '5rem' }}>⏱️</div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {quickActions.map(action => (
            <Link key={action.href} href={action.href} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{action.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{action.label}</h3>
              <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{action.sub}</p>
            </Link>
          ))}
          <button
            onClick={openMessages}
            style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', position: 'relative' }}
          >
            {totalUnread > 0 && (
              <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', backgroundColor: '#c0392b', color: '#FEFFFF', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {totalUnread}
              </span>
            )}
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>💬</div>
            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem', color: '#2A272A' }}>Messages</h3>
            <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>{conversations.length > 0 ? `${conversations.length} active` : 'No active chats'}</p>
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Active Posts', value: stats.activePosts },
            { label: 'Services Given', value: stats.servicesGiven },
            { label: 'Services Received', value: stats.servicesReceived },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, color: '#237371' }}>{stat.value}</p>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

    </main>
  )
}
