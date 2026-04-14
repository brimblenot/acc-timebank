'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../components/NavLinks'

const CATEGORIES = [
  'All',
  'Food & Meals', 'Transportation', 'Home Repair', 'Gardening & Yard Work',
  'Tech Help', 'Childcare', 'Pet Care', 'Tutoring & Education',
  'Errands & Shopping', 'Translation', 'Healthcare Support',
  'Music & Arts', 'Sewing & Crafts', 'Emotional Support', 'Community Event', 'Other',
]

function formatEventDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventsBrowse() {
  const router = useRouter()
  const [viewer, setViewer] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, hour_balance, is_admin, account_type')
        .eq('id', user.id)
        .single()

      setViewer(profile)

      const { data } = await supabase
        .from('events')
        .select(`
          id, title, category, hours_awarded, location, event_date, status, created_at,
          org:profiles!events_org_id_fkey(id, full_name, username),
          event_signups(id)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      setEvents(data || [])
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = events.filter(e => {
    const matchCat = category === 'All' || e.category === category
    const matchSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.org?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const inputStyle = {
    backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem',
    padding: '0.6rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none',
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <NavLinks viewer={viewer} active="/events" />
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Events</h1>
          <p style={{ color: '#94B7A2' }}>Sign up for community events and earn timebank hours.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search events or organizations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: '1', minWidth: '200px' }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, minWidth: '160px' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Results count */}
        <p style={{ fontSize: '0.8rem', color: '#94B7A2', marginBottom: '1.25rem' }}>
          {filtered.length} open event{filtered.length !== 1 ? 's' : ''}
          {category !== 'All' ? ` in ${category}` : ''}
          {search.trim() ? ` matching "${search.trim()}"` : ''}
        </p>

        {/* Event cards */}
        {filtered.length === 0 ? (
          <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#94B7A2', fontSize: '0.9rem' }}>No open events found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem 1.5rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block' }}
              >
                {/* Top row: category + signup count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#237371', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {event.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94B7A2', fontWeight: 500 }}>
                    {event.event_signups?.length ?? 0} signed up
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {event.title}
                </h3>

                {/* Org name */}
                <p style={{ fontSize: '0.8rem', color: '#94B7A2', marginBottom: '0.6rem' }}>
                  by {event.org?.full_name || 'Unknown Organization'}
                </p>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#94B7A2' }}>
                  <span>⭐ {event.hours_awarded} hr{event.hours_awarded !== 1 ? 's' : ''} awarded</span>
                  {event.location && <span>📍 {event.location}</span>}
                  {event.event_date && <span>📅 {formatEventDate(event.event_date)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
