'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  'Food & Meals', 'Transportation', 'Home Repair', 'Gardening & Yard Work',
  'Tech Help', 'Childcare', 'Pet Care', 'Tutoring & Education',
  'Errands & Shopping', 'Translation', 'Healthcare Support',
  'Music & Arts', 'Sewing & Crafts', 'Emotional Support', 'Community Event', 'Other',
]

export default function NewEvent() {
  const router = useRouter()
  const [orgId, setOrgId] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    hours_awarded: '',
    location: '',
    event_date: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('account_type, org_status').eq('id', user.id).single()
      if (profile?.account_type !== 'organization' || profile?.org_status !== 'approved') {
        router.push('/org-dashboard'); return
      }
      setOrgId(user.id)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const hours = parseInt(form.hours_awarded)
    if (!hours || hours < 1 || hours > 20) { setError('Hours to award must be between 1 and 20.'); return }
    setSubmitting(true)

    const { data, error: insertErr } = await supabase.from('events').insert({
      org_id: orgId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      hours_awarded: hours,
      location: form.location.trim() || null,
      event_date: form.event_date || null,
    }).select('id').single()

    if (insertErr) { setError(insertErr.message); setSubmitting(false); return }
    router.push(`/events/${data.id}`)
  }

  const inputStyle = {
    width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC',
    borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem',
    color: '#2A272A', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/org-dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <Link href="/org-dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create Event</h1>
          <p style={{ color: '#94B7A2' }}>Set up a community event and reward attendees with hours.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label style={labelStyle}>Event Title <span style={{ color: '#c0392b' }}>*</span></label>
            <input type="text" required value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Community Garden Volunteer Day"
              style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Description <span style={{ color: '#c0392b' }}>*</span></label>
            <textarea required value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what volunteers will do, what to bring, and what to expect..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={labelStyle}>Category <span style={{ color: '#c0392b' }}>*</span></label>
            <select required value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={inputStyle}>
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Hours to Award Per Attendee <span style={{ color: '#c0392b' }}>*</span>
              <span style={{ color: '#94B7A2', fontWeight: 400 }}> (1–20)</span>
            </label>
            <input type="number" min="1" max="20" required value={form.hours_awarded}
              onChange={e => setForm(p => ({ ...p, hours_awarded: e.target.value }))}
              placeholder="e.g. 3"
              style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Location <span style={{ color: '#94B7A2', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="123 Main St, Gainesville, FL"
              style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Date & Time <span style={{ color: '#94B7A2', fontWeight: 400 }}>(optional)</span></label>
            <input type="datetime-local" value={form.event_date}
              onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
              style={inputStyle} />
          </div>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" disabled={submitting}
              style={{ flex: 1, padding: '0.875rem', backgroundColor: submitting ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
              {submitting ? 'Creating…' : 'Create Event'}
            </button>
            <Link href="/org-dashboard"
              style={{ padding: '0.875rem 1.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </main>
  )
}
