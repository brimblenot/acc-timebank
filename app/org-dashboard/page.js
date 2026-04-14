'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORY_COLORS = {
  'Food & Meals': '#e67e22',
  'Transportation': '#2980b9',
  'Home Repair': '#8e44ad',
  'Gardening': '#27ae60',
  'Tech Help': '#16a085',
  'Education': '#d35400',
  'Health': '#c0392b',
  'Arts': '#7f8c8d',
}

function formatEventDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrgDashboard() {
  const router = useRouter()
  const [org, setOrg] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio, avatar_url, account_type, org_status')
        .eq('id', user.id)
        .single()

      if (!profile || profile.account_type !== 'organization') { router.push('/dashboard'); return }
      if (profile.org_status === 'pending') { router.push('/org-pending'); return }
      if (profile.org_status === 'rejected') { router.push('/org-rejected'); return }

      setOrg(profile)

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, category, hours_awarded, location, event_date, status, created_at, hours_finalized')
        .eq('org_id', user.id)
        .order('created_at', { ascending: false })

      setEvents(eventsData || [])
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const activeEvents = events.filter(e => e.status === 'open')
  const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'cancelled')

  const EventCard = ({ event }) => (
    <Link
      href={`/events/${event.id}`}
      style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#237371', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{event.category}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '9999px', backgroundColor: event.status === 'open' ? '#EBF5F0' : '#F5F5F3', color: event.status === 'open' ? '#237371' : '#94B7A2' }}>
          {event.status}
        </span>
      </div>
      <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#94B7A2' }}>
        <span>⭐ {event.hours_awarded} hr{event.hours_awarded !== 1 ? 's' : ''} awarded</span>
        {event.location && <span>📍 {event.location}</span>}
        {event.event_date && <span>📅 {formatEventDate(event.event_date)}</span>}
        {event.status === 'completed' && event.hours_finalized && (
          <span style={{ color: '#237371', fontWeight: 600 }}>✓ Hours finalized</span>
        )}
      </div>
    </Link>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/org-dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <div>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A', display: 'block', lineHeight: 1.1 }}>ACC Timebank</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#237371', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Organization</span>
          </div>
        </Link>
        <div className="nav-links">
          <Link href="/events" style={{ color: '#94B7A2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Events</Link>
          <Link href={`/profile/${org?.id}`} style={{ color: '#94B7A2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>My Profile</Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {org?.full_name}
            </h1>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>@{org?.username} · Organization Dashboard</p>
          </div>
          <Link
            href="/org-dashboard/events/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.75rem', textDecoration: 'none', fontSize: '0.875rem', flexShrink: 0 }}
          >
            + Create Event
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Active Events', value: activeEvents.length },
            { label: 'Completed Events', value: completedEvents.length },
            { label: 'Total Events', value: events.length },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: '#F5F5F3', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', border: '1px solid #E0E0DC' }}>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371' }}>{s.value}</p>
              <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active Events */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700 }}>Active Events</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#2FB774', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2FB774', display: 'inline-block' }} />
              {activeEvents.length} open
            </span>
          </div>
          {activeEvents.length === 0 ? (
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: '#94B7A2', marginBottom: '1rem' }}>No active events yet.</p>
              <Link href="/org-dashboard/events/new" style={{ color: '#237371', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>Create your first event →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <section>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.25rem', color: '#94B7A2' }}>
              Completed Events
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.75 }}>
              {completedEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
